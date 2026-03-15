import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, content, post_type, likes_count, churru_count, created_at, parent_id,
      cats (id, name, avatar_url)
    `)
    .is("thread_id", null)
    .order("created_at", { ascending: false });

  return NextResponse.json(
    { 
      posts: data || [],
      v: 3,
      debug_db_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      env_check: {
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        service_key_len: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      }
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache",
      },
    }
  );
}
