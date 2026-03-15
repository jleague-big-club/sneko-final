import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// POST /api/likes  body: { postId, userId }
export async function POST(req: NextRequest) {
  const { postId } = await req.json();

  // ユーザー認証: Supabase セッションから取得
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

  // いいねをUpsert（重複NG: UNIQUE制約）
  const { error: insertError } = await supabaseAdmin
    .from("likes")
    .insert({ user_id: user.id, post_id: postId });

  if (insertError) {
    // 既にいいね済み（UNIQUE制約違反）→ いいね解除
    if (insertError.code === "23505") {
      await supabaseAdmin
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);

      // likes_countを减らす
      await supabaseAdmin.rpc("decrement_likes", { post_id: postId });
      return NextResponse.json({ liked: false });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // likes_countを増やす
  await supabaseAdmin.rpc("increment_likes", { post_id: postId });
  return NextResponse.json({ liked: true });
}
