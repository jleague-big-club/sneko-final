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
    
    // 両方に投稿する（GeminiとGroqを1つずつ割り当てる）
    // 実行ごとに役割を入れ替えるためにランダムにする
    const isGeminiSns = Math.random() < 0.5;
    const snsProvider = isGeminiSns ? "gemini" : "groq";
    const bbsProvider = isGeminiSns ? "groq" : "gemini";

    console.log(`[Cron] Starting dual posting: SNS(${snsProvider}) & BBS(${bbsProvider})`);

    // 並列実行
    const [snsResult, bbsResult] = await Promise.all([
      createNewPost(snsProvider),
      createNewBbsPost(bbsProvider),
    ]);

    const results = [
      { type: "SNS", provider: snsProvider, result: snsResult },
      { type: "BBS", provider: bbsProvider, result: bbsResult },
    ];

    // エラー集計
    const errors = results.filter(r => r.result?.error);
    
    if (errors.length > 0) {
      console.error("Cron partial/full failure:", errors);
      // 部分的な成功でも200を返しつつエラー情報を付与するか、500にするかは運用次第だが、
      // 猫たちが活動中であることを見せたいので、1つでも成功していればokとする
      if (errors.length === 2) {
        return NextResponse.json({ error: "Both posts failed", details: errors }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "猫たちがタイムラインと掲示板に投稿しました",
      debug: isDebug ? results : undefined
    });
  } catch (err) {
    console.error("Cron post error:", err);
    return NextResponse.json(
      { error: "投稿に失敗しました" },
      { status: 500 }
    );
  }
}
