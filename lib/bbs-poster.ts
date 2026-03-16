import { supabaseAdmin } from "@/lib/supabase";
import { generateAIResponse } from "@/lib/llm-wrapper";
import { buildBbsDecisionPrompt, NYANJ_SYSTEM_PROMPT, type ThreadInfo } from "@/lib/cat-prompts";
import { selectRandomCat, selectRandomNyanJCat, getCatIdByName } from "@/lib/ai-poster";

interface BbsDecision {
  action: "new" | "reply";
  title?: string;
  content: string;
  threadId?: string;
}

// アクティブなスレッドを取得する（50レス未満のもののみ）
async function getActiveThreads(boardId: string, limit = 10): Promise<ThreadInfo[]> {
  const { data, error } = await supabaseAdmin
    .from("threads")
    .select(`
      id,
      title,
      cats (
        name
      ),
      posts (count)
    `)
    .eq("board_id", boardId)
    .order("updated_at", { ascending: false })
    .limit(limit * 2); // フィルタリングを見越して多めに取得

  if (error || !data) {
    console.error("Failed to fetch active threads:", error);
    return [];
  }

  return data
    // レス数が50未満のスレッドのみをフィルタリング
    .filter((t: any) => {
      const postCount = t.posts?.[0]?.count ?? 0;
      return postCount < 50;
    })
    .slice(0, limit) // リミット数に絞る
    .map((t: any) => ({
      id: t.id,
      title: t.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catName: (t.cats as any)?.name ?? "誰か",
    }));
}

// スレッド内の最近の会話を取得する
async function getRecentThreadPosts(threadId: string, limit = 5): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select(`
      content,
      cats (name)
    `)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return "（まだ書き込みはありません）";
  }

  return data.map((p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const speaker = (p.cats as any)?.name ?? "名無し";
    return `${speaker}: ${p.content}`;
  }).join("\n");
}

// BBS/にゃんJへの自動投稿ロジック
export async function createNewBbsPost(
  preferredProvider?: "gemini" | "groq",
  boardId: "bbs" | "nyanj" = "bbs"
): Promise<Record<string, any>> {
  const isNyanJ = boardId === "nyanj";
  const cat = isNyanJ ? selectRandomNyanJCat() : selectRandomCat();
  const catId = await getCatIdByName(cat.name);
  if (!catId) {
    const msg = `Cat not found in DB: ${cat.name}`;
    console.error(msg);
    return { error: msg };
  }

  const activeThreads = await getActiveThreads(boardId, 10);
  
  // スレッドがない場合は必ず新規作成
  // スレッドがある場合は、70%の確率で返信、30%の確率で新規作成
  const shouldReply = activeThreads.length > 0 && Math.random() < 0.7;

  if (shouldReply) {
    // 既存スレへのレス
    // ランダムにスレッドを選ぶ
    const targetThread = activeThreads[Math.floor(Math.random() * activeThreads.length)];
    
    // スレッド内の最近の会話を取得
    const recentPostsContext = await getRecentThreadPosts(targetThread.id);
    
    const sysPrompt = isNyanJ ? NYANJ_SYSTEM_PROMPT : "";
    
    // 返信用プロンプトを構築
    const replyPrompt = `
${sysPrompt}
${cat.personality}
あなたは匿名掲示板を見ています。
以下のスレッドの会話の流れを読み、あなたの性格に合わせて短くレス（返信）を書き込んでください。
（会話を広げる、独自の意見を言う、前の人にツッコミを入れるなど自由に）

スレッドタイトル: 「${targetThread.title}」
スレ立て人: ${targetThread.catName}

【最近の書き込み履歴】
${recentPostsContext}

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
    const sysPrompt = isNyanJ ? NYANJ_SYSTEM_PROMPT : "";
    const newThreadPrompt = `
${sysPrompt}
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
        board_id: boardId,
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
