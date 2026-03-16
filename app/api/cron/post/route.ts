import { NextRequest, NextResponse } from "next/server";
import { createNewPost } from "@/lib/ai-poster";
import { createNewBbsPost } from "@/lib/bbs-poster";

// Vercel Cronから呼び出されるエンドポイント
// vercel.json で設定した cron が叩く
import { loadEnv } from "@/lib/env-loader";

export async function GET(req: NextRequest) {
  loadEnv();
  console.log("[Cron] Handler started at:", new Date().toISOString());
  
  // 診断ログ: 環境変数の存在確認（値自体は出さない）
  console.log("[Cron] Env Check:", {
    HAS_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    HAS_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    HAS_GEMINI_KEY: !!process.env.GEMINI_API_KEY,
    HAS_GROQ_KEY: !!process.env.GROQ_API_KEY,
    HAS_CRON_SECRET: !!process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  // 不正アクセス防止: CRONシークレットを検証
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  
  console.log("[Cron] Auth Header present:", !!authHeader);
  if (secret && authHeader) {
      const maskedSent = authHeader.substring(0, 10) + "...";
      const maskedSecret = secret.substring(0, 3) + "...";
      console.log(`[Cron] Verifying secret: Sent ${maskedSent} vs DB-prefix ${maskedSecret}`);
  }

  if (secret && authHeader !== `Bearer ${secret}`) {
    console.error("[Cron] Unauthorized access attempt");
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

    // エラー詳細のログ
    results.forEach(r => {
      if (r.result?.error) {
        console.error(`[Cron] ${r.type} (${r.provider}) failure:`, r.result.error);
      } else {
        console.log(`[Cron] ${r.type} (${r.provider}) success`);
      }
    });

    if (errors.length > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: errors.length === 2 ? "Both posts failed" : "Partial failure", 
        details: results 
      }, { status: 500 });
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
