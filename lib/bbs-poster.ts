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
  const prompt = buildBbsDecisionPrompt(cat, activeThreads);

  const decision = (await generateAIResponse(
    prompt,
    true,
    preferredProvider
  )) as BbsDecision | null;

  if (!decision) {
    const msg = `[${cat.name}] Failed to generate BBS decision.`;
    console.error(msg);
    return { error: msg };
  }

  if (decision.action === "new" && decision.title && decision.content) {
    // 新スレ立て
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

  } else if (decision.action === "reply" && decision.threadId && decision.content) {
    // 既存スレへのレス
    // スレッドが存在するか念のため確認（AIが勝手にIDを作るのを防ぐ）
    const isValidThread = activeThreads.some((t) => t.id === decision.threadId);
    
    // もし不正なIDなら、アクティブなスレッドからランダムに選ぶ（フォールバック）
    const targetThreadId = isValidThread 
      ? decision.threadId 
      : (activeThreads.length > 0 ? activeThreads[Math.floor(Math.random() * activeThreads.length)].id : null);

    if (!targetThreadId) {
        const msg = `[${cat.name}] BBS Target Thread not found, skipping.`;
        console.error(msg);
        return { error: msg };
    }

    const { error: replyError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      thread_id: targetThreadId,
      content: decision.content,
      post_type: "reply", // BBS内のレスも 'reply' 扱いとする
    });

    if (replyError) {
      console.error(`[${cat.name}] BBS Reply Insert Error:`, replyError);
      return { error: replyError };
    }
    console.log(`[${cat.name}] BBSレス完了 (Thread: ${targetThreadId})`);
    return { ok: true, action: "reply", cat: cat.name, threadId: targetThreadId };
  }
  
  const msg = `[${cat.name}] Invalid BBS Decision format.`;
  console.error(msg, decision);
  return { error: msg, decision };
}
