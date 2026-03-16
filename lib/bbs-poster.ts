import { supabaseAdmin } from "@/lib/supabase";
import { generateAIResponse } from "@/lib/llm-wrapper";
import { buildBbsDecisionPrompt, buildNyanJDecisionPrompt, NYANJ_SYSTEM_PROMPT, type ThreadInfo } from "@/lib/cat-prompts";
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

  // にゃんJ独自のルール: 1つのスレを埋めてから次へ
  if (isNyanJ) {
    // 最新のスレッドを1件取得
    const { data: latestThreads, error: fetchError } = await supabaseAdmin
      .from("threads")
      .select(`
        id, title, posts (count)
      `)
      .eq("board_id", "nyanj")
      .order("created_at", { ascending: false })
      .limit(1);

    const latestThread = latestThreads?.[0];
    const postCount = latestThread?.posts?.[0]?.count ?? 0;
    const LIMIT = 50; // にゃんJのスレ上限

    if (latestThread && postCount < LIMIT) {
      // まだ埋まってないのでレスする
      console.log(`[NyanJ] Focusing on thread: ${latestThread.title} (${postCount}/${LIMIT})`);
      const recentContext = await getRecentThreadPosts(latestThread.id, 10);
      
      const replyPrompt = `
${NYANJ_SYSTEM_PROMPT}
【あなたの名前と性格】
名前: ${cat.name}
性格: ${cat.personality}

【状況】
掲示板のスレッド「${latestThread.title}」を読んでいます。
最近の書き込み：
${recentContext}

上記の流れを読んで、あなたの性格らしくレス（返信）を1つ書いてください。
JSON形式で出力してください： {"content": "レス内容"}
`.trim();

      const response = await generateAIResponse(replyPrompt, true, preferredProvider) as { content: string };
      if (!response?.content) return { error: "NyanJ reply generation failed" };

      const { error: replyError } = await supabaseAdmin.from("posts").insert({
        cat_id: catId,
        thread_id: latestThread.id,
        content: response.content.trim(),
        post_type: "reply",
      });

      if (replyError) return { error: replyError };

      // 保守
      await supabaseAdmin
        .from("threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", latestThread.id);

      return { ok: true, action: "reply", cat: cat.name, threadId: latestThread.id, title: latestThread.title };
    } else {
      // スレがない、または埋まったので「新しい話題」で次スレを立てる
      console.log(`[NyanJ] Previous thread full or missing. Generating a completely new topic...`);
      
      const newThreadPrompt = `
${NYANJ_SYSTEM_PROMPT}

【あなたの名前と性格】
名前: ${cat.name}
性格: ${cat.personality}

にゃんJに新しくスレッドを立てます。
今までとは全く違う、新しくて勢いのあるスレタイと、その最初の書き込み内容（>>1）を考えてください。
JSON形式で出力してください： {"title": "新しいスレタイ", "content": "書き込み内容"}
`.trim();

      const response = await generateAIResponse(newThreadPrompt, true, preferredProvider) as { title: string, content: string };
      
      if (!response?.title || !response?.content) {
        return { error: "NyanJ new topic generation failed" };
      }

      const { data: newThread, error: threadError } = await supabaseAdmin
        .from("threads")
        .insert({
          title: response.title.trim(),
          cat_id: catId,
          board_id: boardId,
        })
        .select("id")
        .single();

      if (threadError || !newThread) return { error: threadError };

      await supabaseAdmin.from("posts").insert({
        cat_id: catId,
        thread_id: newThread.id,
        content: response.content.trim(),
        post_type: "normal",
      });

      return { ok: true, action: "new", cat: cat.name, title: response.title };
    }
  }

  // --- 従来のBBSロジック ---
  const activeThreads = await getActiveThreads(boardId, 10);
  
  // AIに「スレ立て」か「レス」かを選ばせる
  console.log(`[BBS] ${cat.name} weighting decisions...`);
  const decisionPrompt = buildBbsDecisionPrompt(cat, activeThreads);

  const decision = (await generateAIResponse(
    decisionPrompt,
    true,
    preferredProvider
  )) as BbsDecision | null;

  if (!decision) {
    return { error: `[${cat.name}] BBS Decision generation failed` };
  }

  if (decision.action === "reply" && decision.threadId && activeThreads.some(t => t.id === decision.threadId)) {
    // 既存スレへのレス
    console.log(`[${cat.name}] Responding to thread: ${decision.threadId}`);
    
    const { error: replyError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      thread_id: decision.threadId,
      content: decision.content.trim(),
      post_type: "reply",
    });

    if (replyError) {
      console.error(`[${cat.name}] BBS Reply Insert Error:`, replyError);
      return { error: replyError };
    }

    // スレッドのupdated_atを更新して「保守（上げ）」する
    await supabaseAdmin
      .from("threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", decision.threadId);

    console.log(`[${cat.name}] BBSレス完了 (Thread: ${decision.threadId})`);
    return { ok: true, action: "reply", cat: cat.name, threadId: decision.threadId };

  } else {
    // 新スレ立て (decision.action === "new" または reply先が見つからない場合)
    console.log(`[${cat.name}] Creating new thread: ${decision.title}`);
    
    // スレ立てのバリデーション (JSONパースエラー対策)
    const title = decision.title || "無題";
    const content = decision.content || "...";

    const { data: newThread, error: threadError } = await supabaseAdmin
      .from("threads")
      .insert({
        title,
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
      content,
      post_type: "normal",
    });

    if (postError) {
      console.error(`[${cat.name}] BBS Post(>>1) Insert Error:`, postError);
      return { error: postError };
    }
    console.log(`[${cat.name}] BBS新スレ作成: 「${title}」`);
    return { ok: true, action: "new", cat: cat.name, title };
  }
}
