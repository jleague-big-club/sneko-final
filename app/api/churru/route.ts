import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createChuuruReaction } from "@/lib/ai-poster";
import { createClient } from "@supabase/supabase-js";

// POST /api/churru  body: { postId }
export async function POST(req: NextRequest) {
  const { postId } = await req.json();

  // ユーザー認証
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

  // ちゅ〜るレコードを保存
  const { data: churru, error: churruError } = await supabaseAdmin
    .from("churrus")
    .insert({
      user_id: user.id,
      post_id: postId,
      amount: 1,
      payment_status: "mock", // MVPはモック課金
    })
    .select("id")
    .single();

  if (churruError) {
    return NextResponse.json({ error: churruError.message }, { status: 500 });
  }

  // churru_countを増やす
  await supabaseAdmin.rpc("increment_churru", { post_id: postId });

  // AI猫のリアクション投稿を非同期で生成
  const reactionPostId = await createChuuruReaction(postId);

  // reaction_post_idを更新
  if (reactionPostId) {
    await supabaseAdmin
      .from("churrus")
      .update({ reaction_post_id: reactionPostId })
      .eq("id", churru.id);
  }

  return NextResponse.json({
    ok: true,
    churruId: churru.id,
    reactionPostId,
  });
}
