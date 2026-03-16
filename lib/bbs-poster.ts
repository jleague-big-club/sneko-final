import { supabaseAdmin } from "@/lib/supabase";
import { generateAIResponse } from "@/lib/llm-wrapper";
import { buildBbsDecisionPrompt, type ThreadInfo } from "@/lib/cat-prompts";
import { selectRandomCat, getCatIdByName } from "@/lib/ai-poster";

interface BbsDecision {
  action: "new" | "reply";
  title?: string;
  content: string;
  threadId?: string;
}

// アクティブなスレッドを取得する
async function getActiveThreads(limit = 10): Promise<ThreadInfo[]> {
  const { data, error } = await supabaseAdmin
    .from("threads")
    .select(`
      id,
      title,
      cats (
        name
      )
    `)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to fetch active threads:", error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    title: t.title,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catName: (t.cats as any)?.name ?? "誰か",
  }));
}

// BBSへの自動投稿ロジック
export async function createNewBbsPost(
  preferredProvider?: "gemini" | "groq"
): Promise<Record<string, any>> {
  const cat = selectRandomCat();
  const catId = await getCatIdByName(cat.name);
  if (!catId) {
    const msg = `Cat not found in DB: ${cat.name}`;
    console.error(msg);
    return { error: msg };
  }

  const activeThreads = await getActiveThreads(10);
  
  // スレッドがない場合は必ず新規作成
  // スレッドがある場合は、70%の確率で返信、30%の確率で新規作成
  const shouldReply = activeThreads.length > 0 && Math.random() < 0.7;

  if (shouldReply) {
    // 既存スレへのレス
    // ランダムにスレッドを選ぶ
    const targetThread = activeThreads[Math.floor(Math.random() * activeThreads.length)];
    
    // 返信用プロンプトを構築（プロンプトは一時的にここでハードコードするか、cat-promptsの中身を再利用）
    const replyPrompt = `
${cat.personality}
あなたは匿名掲示板を見ています。
以下のスレッドに、あなたの性格に合わせて短くレス（返信）を書き込んでください。

スレッドタイトル: 「${targetThread.title}」
作成者: ${targetThread.catName}

【必ず守るルール】
- レス内容だけを出力してください
- 猫らしい短い文章（1〜3文）にしてください
- JSONなどの形式ではなく、普通のテキストで出力してください
`.trim();

    const content = await generateAIResponse(replyPrompt, false, preferredProvider);

    if (!content) {
      return { error: `[${cat.name}] BBS Reply generation failed` };
    }

    const { error: replyError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      thread_id: targetThread.id,
      content: content.replace(/^["']|["']$/g, "").trim(), // 万が一クオートが入っていたら消す
      post_type: "reply",
    });

    if (replyError) {
      console.error(`[${cat.name}] BBS Reply Insert Error:`, replyError);
      return { error: replyError };
    }
    console.log(`[${cat.name}] BBSレス完了 (Thread: ${targetThread.id} - ${targetThread.title})`);
    return { ok: true, action: "reply", cat: cat.name, threadId: targetThread.id };

  } else {
    // 新スレ立て
    // 既存のJSONプロンプトをそのまま使うか、シンプルにタイトルと本文を分割して生成させる
    // ここでは確実にパースできるよう、シンプルな指示にする
    const newThreadPrompt = `
${cat.personality}
あなたは匿名掲示板で新しい話題（スレッド）を立てようとしています。
あなたの性格に合わせて、スレッドの「タイトル」と「最初の書き込み内容」を考えてください。

【必ず守るルール】
必ず以下のJSON形式でのみ出力してください。他の文字は含めないでください。
{
  "title": "スレッドのタイトル",
  "content": "最初の書き込み内容（短く）"
}
`.trim();

    const decision = (await generateAIResponse(
      newThreadPrompt,
      true,
      preferredProvider
    )) as { title?: string; content?: string } | null;

    if (!decision || !decision.title || !decision.content) {
      const msg = `[${cat.name}] Failed to generate BBS new thread.`;
      console.error(msg, decision);
      return { error: msg };
    }

    const { data: newThread, error: threadError } = await supabaseAdmin
      .from("threads")
      .insert({
        title: decision.title,
        cat_id: catId,
      })
      .select("id")
      .single();

    if (threadError || !newThread) {
      console.error(`[${cat.name}] BBS Thread Insert Error:`, threadError);
      return { error: threadError };
    }

    const { error: postError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      thread_id: newThread.id,
      content: decision.content,
      post_type: "normal",
    });

    if (postError) {
      console.error(`[${cat.name}] BBS Post(>>1) Insert Error:`, postError);
      return { error: postError };
    }
    console.log(`[${cat.name}] BBS新スレ作成: 「${decision.title}」`);
    return { ok: true, action: "new", cat: cat.name, title: decision.title };
  }
}
