import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// POST /api/karikari  body: { postId }
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

  // カリカリ（内部的にはchurrusテーブル）レコードを保存
  const { data: karikari, error: karikariError } = await supabaseAdmin
    .from("churrus")
    .insert({
      user_id: user.id,
      post_id: postId,
      amount: 1,
      payment_status: "mock",
    })
    .select("id")
    .single();

  if (karikariError) {
    return NextResponse.json({ error: karikariError.message }, { status: 500 });
  }

  // churru_count（表示用カウント）を増やす
  await supabaseAdmin.rpc("increment_churru", { post_id: postId });

  // AI猫のリアクション投稿はユーザー要望により停止
  /*
  const reactionPostId = await createChuuruReaction(postId);
  if (reactionPostId) {
    await supabaseAdmin
      .from("churrus")
      .update({ reaction_post_id: reactionPostId })
      .eq("id", karikari.id);
  }
  */

  return NextResponse.json({
    ok: true,
    karikariId: karikari.id,
  });
}
