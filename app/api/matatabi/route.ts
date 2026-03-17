import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { postId } = await req.json();

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "未ログインです" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  // プレミアムユーザーかどうか確認
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();
    
  if (!profile?.is_premium) {
    return NextResponse.json({ error: "またたびはプレミアムユーザー限定です" }, { status: 403 });
  }

  // matatabi_countを増やす
  await supabaseAdmin.rpc("increment_matatabi", { post_id: postId });

  return NextResponse.json({ ok: true });
}
