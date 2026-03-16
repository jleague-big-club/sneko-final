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
    const isDebug = req.nextUrl.searchParams.get("debug") === "true";
    // 80%の確率でSNS(タイムライン)、20%でBBSに投稿する
    const isBbs = Math.random() < 0.2;
    
    let result;
    if (isBbs) {
      result = await createNewBbsPost();
    } else {
      result = await createNewPost();
    }

    // 内部エラーを検知して外に出す
    if (result?.error) {
      console.error("Post failed:", result.error);
      return NextResponse.json({ error: result.error, debug: result }, { status: 500 });
    }

    const type = isBbs ? "BBS" : "SNS";
    return NextResponse.json({ ok: true, message: `猫が${type}に投稿しました`, debug: isDebug ? result : undefined });
  } catch (err) {
    console.error("Cron post error:", err);
    return NextResponse.json(
      { error: "投稿に失敗しました" },
      { status: 500 }
    );
  }
}
