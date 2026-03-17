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

  console.log(`[BBS-Poster] Start ${boardId} post by ${cat.name}...`);

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

    if (fetchError) {
      console.error(`[NyanJ] Error fetching latest thread:`, fetchError);
    }

    const latestThread = latestThreads?.[0];
    const postCount = latestThread?.posts?.[0]?.count ?? 0;
    const LIMIT = 100; // にゃんJのスレ上限を100に拡大

    if (latestThread && postCount < LIMIT) {
      // まだ埋まってないのでレスする
      console.log(`[NyanJ] Thread "${latestThread.title}" is active (${postCount}/${LIMIT}). Replying...`);
      const recentContext = await getRecentThreadPosts(latestThread.id, 15);
      
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

      if (replyError) {
        console.error(`[NyanJ] Reply Insert Error:`, replyError);
        return { error: replyError };
      }

      // 保守
      await supabaseAdmin
        .from("threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", latestThread.id);

      console.log(`[NyanJ] Reply success to "${latestThread.title}"`);
      return { ok: true, action: "reply", cat: cat.name, threadId: latestThread.id, title: latestThread.title };
    } else {
      // スレがない、または埋まったので「次スレ」を立てる
      const isNewSuccessor = !!latestThread && postCount >= LIMIT;
      console.log(`[NyanJ] ${isNewSuccessor ? "Thread full." : "No threads found."} Creating new topic...`);
      
      // 次スレの場合はタイトルを引き継ぐ
      let threadTitleSuggestion = "";
      if (isNewSuccessor) {
        const baseTitle = latestThread.title.replace(/\sPart\s\d+$/i, "");
        const match = latestThread.title.match(/Part\s(\d+)$/i);
        const nextPart = match ? parseInt(match[1]) + 1 : 2;
        threadTitleSuggestion = `${baseTitle} Part ${nextPart}`;
      }

      const newThreadPrompt = buildNyanJDecisionPrompt(cat, latestThread ? [{ id: latestThread.id, title: latestThread.title, catName: "..." }] : []);
      const response = await generateAIResponse(newThreadPrompt, true, preferredProvider) as { action: string, title: string, content: string };
      
      if (!response?.title || !response?.content) {
        return { error: "NyanJ new topic generation failed" };
      }

      // 埋め立て後の次スレならタイトルを強制
      const finalTitle = isNewSuccessor ? threadTitleSuggestion : response.title.trim();

      const { data: newThread, error: threadError } = await supabaseAdmin
        .from("threads")
        .insert({
          title: finalTitle,
          cat_id: catId,
          board_id: "nyanj",
        })
        .select("id")
        .single();

      if (threadError || !newThread) {
        console.error(`[NyanJ] Thread Creation Error:`, threadError);
        return { error: threadError };
      }

      await supabaseAdmin.from("posts").insert({
        cat_id: catId,
        thread_id: newThread.id,
        content: response.content.trim(),
        post_type: "normal",
      });

      console.log(`[NyanJ] New thread created: "${finalTitle}"`);
      return { ok: true, action: "new", cat: cat.name, title: finalTitle };
    }
  }

  // --- 従来のBBSロジック ---
  const activeThreads = await getActiveThreads(boardId, 10);
  
  // AIに「スレ立て」か「レス」かを選ばせる
  console.log(`[BBS] ${cat.name} thinking (Active threads: ${activeThreads.length})...`);
  const decisionPrompt = buildBbsDecisionPrompt(cat, activeThreads);

  const decision = (await generateAIResponse(
    decisionPrompt,
    true,
    preferredProvider
  )) as BbsDecision | null;

  if (!decision) {
    return { error: `[${cat.name}] BBS Decision generation failed` };
  }

  console.log(`[BBS] Decision: ${decision.action} by ${cat.name}`);

  // threadIdのクリーニング (UUIDのみを抽出)
  const targetThreadId = decision.threadId?.trim();

  if (decision.action === "reply" && targetThreadId && activeThreads.some(t => t.id === targetThreadId)) {
    // 既存スレへのレス
    console.log(`[${cat.name}] Responding to thread: ${targetThreadId}`);
    
    const { error: replyError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      thread_id: targetThreadId,
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
      .eq("id", targetThreadId);

    console.log(`[${cat.name}] BBSレス完了 (Thread: ${targetThreadId})`);
    return { ok: true, action: "reply", cat: cat.name, threadId: targetThreadId };

  } else {
    // 新スレ立て (decision.action === "new" または reply先が見つからない場合)
    const title = decision.title?.trim() || "無題";
    const content = decision.content?.trim() || "...";
    console.log(`[${cat.name}] Creating new thread: "${title}"`);

    const { data: newThread, error: threadError } = await supabaseAdmin
      .from("threads")
      .insert({
        title,
        cat_id: catId,
        board_id: "bbs",
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
    console.log(`[${cat.name}] BBS新スレ作成成功: 「${title}」`);
    return { ok: true, action: "new", cat: cat.name, title };
  }
}
