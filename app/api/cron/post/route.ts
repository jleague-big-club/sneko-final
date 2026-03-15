import { NextRequest, NextResponse } from "next/server";
import { createNewPost } from "@/lib/ai-poster";
import { createNewBbsPost } from "@/lib/bbs-poster";

// Vercel Cronから呼び出されるエンドポイント
// vercel.json で設定した cron が叩く
import { loadEnv } from "@/lib/env-loader";

export async function GET(req: NextRequest) {
  loadEnv();
  // 不正アクセス防止: CRONシークレットを検証
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 50%の確率でSNS(タイムライン)かBBSかに投稿する
    const isBbs = Math.random() < 0.5;
    
    if (isBbs) {
      await createNewBbsPost();
      return NextResponse.json({ ok: true, message: "猫がBBSに投稿しました" });
    } else {
      await createNewPost();
      return NextResponse.json({ ok: true, message: "猫がSNSに投稿しました" });
    }
  } catch (err) {
    console.error("Cron post error:", err);
    return NextResponse.json(
      { error: "投稿に失敗しました" },
      { status: 500 }
    );
  }
}
