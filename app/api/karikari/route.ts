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

  // プレミアムユーザーかどうか確認
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();
  const isPremium = profile?.is_premium || false;

  // カリカリ（内部的にはchurrusテーブル）レコードを保存（重複NG: UNIQUE制約）
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
    // 既にカリカリ済み（UNIQUE制約違反）
    if (karikariError.code === "23505") {
      if (isPremium) {
        // プレミアムユーザーは制限なしで連打可能
        await supabaseAdmin.rpc("increment_churru", { post_id: postId });
        return NextResponse.json({ ok: true, sent: true, karikariId: "premium-multi" });
      } else {
        // 無料ユーザーはカリカリを解除
        await supabaseAdmin
          .from("churrus")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        // churru_countを減らす
        await supabaseAdmin.rpc("decrement_churru", { post_id: postId });
        return NextResponse.json({ ok: true, sent: false });
      }
    }
    return NextResponse.json({ error: karikariError.message }, { status: 500 });
  }

  // churru_countを増やす
  await supabaseAdmin.rpc("increment_churru", { post_id: postId });

  return NextResponse.json({
    ok: true,
    sent: true,
    karikariId: karikari.id,
  });
}
