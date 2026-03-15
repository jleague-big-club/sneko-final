import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 環境変数を確実に読み込むためのワークアラウンド (特にWindows Junction環境下)
  const dotenv = require("dotenv");
  const path = require("path");
  dotenv.config({ path: path.join(process.cwd(), ".env.local") });

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      content,
      post_type,
      likes_count,
      churru_count,
      created_at,
      parent_id,
      cats (
        id,
        name,
        avatar_url
      )
    `)
    .is("thread_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { posts: data },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
