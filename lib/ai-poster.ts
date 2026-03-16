import { supabaseAdmin } from "@/lib/supabase";
import { generateAIResponse } from "@/lib/llm-wrapper";
import {
  CATS,
  NYANJ_CATS,
  buildPostPrompt,
  buildReplyPrompt,
  buildKarikariPrompt,
  type CatPromptConfig,
} from "@/lib/cat-prompts";

// 重みに基づいてランダムに猫を選ぶ
export function selectRandomCat(): CatPromptConfig {
  const totalWeight = CATS.reduce((sum, cat) => sum + cat.postWeight, 0);
  let random = Math.random() * totalWeight;
  for (const cat of CATS) {
    random -= cat.postWeight;
    if (random <= 0) return cat;
  }
  return CATS[0];
}

// 重みに基づいてにゃんJ用の猫をランダムに選ぶ
export function selectRandomNyanJCat(): CatPromptConfig {
  const totalWeight = NYANJ_CATS.reduce((sum, cat) => sum + cat.postWeight, 0);
  let random = Math.random() * totalWeight;
  for (const cat of NYANJ_CATS) {
    random -= cat.postWeight;
    if (random <= 0) return cat;
  }
  return NYANJ_CATS[0];
}

// DB上の猫IDを名前で引く
export async function getCatIdByName(name: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("cats")
    .select("id")
    .eq("name", name)
    .single();
  return data?.id ?? null;
}

// 最近の投稿を取得（リプライ候補用）
async function getRecentPosts(limit = 10) {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, content, cat_id, cats(name)")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// 通常投稿を生成してDBに保存
export async function createNewPost(
  preferredProvider?: "gemini" | "groq"
): Promise<Record<string, any>> {
  const cat = selectRandomCat();
  const catId = await getCatIdByName(cat.name);
  if (!catId) {
    const msg = `Cat not found in DB: ${cat.name}`;
    console.error(msg);
    return { error: msg };
  }

  // 10%の確率でリプライにする
  const shouldReply = Math.random() < 0.1;

  if (shouldReply) {
    return await createReplyPost(cat, catId, preferredProvider);
  } else {
    return await createOriginalPost(cat, catId, preferredProvider);
  }
}

// 通常投稿
async function createOriginalPost(
  cat: CatPromptConfig,
  catId: string,
  preferredProvider?: "gemini" | "groq"
): Promise<Record<string, any>> {
  try {
    console.log(`[${cat.name}] Generating post content using ${preferredProvider || 'default provider'}...`);
    const content = await generateAIResponse(buildPostPrompt(cat), false, preferredProvider);
    console.log(`[${cat.name}] Generated content: ${content.substring(0, 50)}...`);
    
    const { error: insertError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      content,
      post_type: "normal",
    });
    
    if (insertError) {
      console.error(`[${cat.name}] Supabase Insert Error:`, insertError);
      return { error: insertError };
    }
    console.log(`[${cat.name}] 投稿完了: ${content.substring(0, 30)}...`);
    return { ok: true, cat: cat.name, content };
  } catch (err: any) {
    console.error(`[${cat.name}] Gemini API or other error:`, err?.message || err);
    return { error: err?.message || err };
  }
}

// リプライ投稿
async function createReplyPost(
  cat: CatPromptConfig,
  catId: string,
  preferredProvider?: "gemini" | "groq"
): Promise<Record<string, any>> {
  const recentPosts = await getRecentPosts(5);
  if (recentPosts.length === 0) {
    // リプライ先がなければ通常投稿
    return await createOriginalPost(cat, catId, preferredProvider);
  }

  // 自分以外の投稿からランダムに選ぶ
  const otherPosts = recentPosts.filter((p: any) => p.cat_id !== catId);
  const target =
    otherPosts.length > 0
      ? otherPosts[Math.floor(Math.random() * otherPosts.length)]
      : recentPosts[Math.floor(Math.random() * recentPosts.length)];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetCatName = (target.cats as any)?.name ?? "誰か";

  try {
    const content = await generateAIResponse(
      buildReplyPrompt(cat, target.content, targetCatName),
      false,
      preferredProvider
    );
    const { error: insertError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      content,
      parent_id: target.id,
      post_type: "reply",
    });

    if (insertError) {
      console.error(`[${cat.name}] Supabase Insert Reply Error:`, insertError);
      return { error: insertError };
    }
    console.log(`[${cat.name}] → [${targetCatName}] リプライ完了`);
    return { ok: true, cat: cat.name, target: targetCatName, type: "reply" };
  } catch (err: any) {
    console.error(`[${cat.name}] Gemini API or other error in reply:`, err?.message || err);
    return { error: err?.message || err };
  }
}

// カリカリ受信後の特別リプライ生成（現在は停止中）
export async function createKarikariReaction(
  postId: string
): Promise<string | null> {
  // 投稿情報を取得
  const { data: post } = await supabaseAdmin
    .from("posts")
    .select("id, content, cat_id, cats(name)")
    .eq("id", postId)
    .single();

  if (!post) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catName = (post.cats as any)?.name;
  const cat = CATS.find((c) => c.name === catName);
  if (!cat) return null;

  try {
    const content = await generateAIResponse(
      buildKarikariPrompt(cat, post.content)
    );

    const { data: reactionPost } = await supabaseAdmin
      .from("posts")
      .insert({
        cat_id: post.cat_id,
        content,
        parent_id: postId,
        post_type: "churru_reaction",
      })
      .select("id")
      .single();

    return reactionPost?.id ?? null;
  } catch (err) {
    console.error("カリカリリアクション生成失敗:", err);
    return null;
  }
}
