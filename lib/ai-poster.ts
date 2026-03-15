import { supabaseAdmin } from "@/lib/supabase";
import { generateAIResponse } from "@/lib/llm-wrapper";
import {
  CATS,
  buildPostPrompt,
  buildReplyPrompt,
  buildChuuruPrompt,
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
export async function createNewPost(): Promise<void> {
  const cat = selectRandomCat();
  const catId = await getCatIdByName(cat.name);
  if (!catId) {
    console.error(`Cat not found in DB: ${cat.name}`);
    return;
  }

  // 10%の確率でリプライにする
  const shouldReply = Math.random() < 0.1;

  if (shouldReply) {
    await createReplyPost(cat, catId);
  } else {
    await createOriginalPost(cat, catId);
  }
}

// 通常投稿
async function createOriginalPost(
  cat: CatPromptConfig,
  catId: string
): Promise<void> {
  try {
    const content = await generateAIResponse(buildPostPrompt(cat));
    const { error: insertError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      content,
      post_type: "normal",
    });
    
    if (insertError) {
      console.error(`[${cat.name}] Supabase Insert Error:`, insertError);
      return;
    }
    console.log(`[${cat.name}] 投稿完了: ${content.substring(0, 30)}...`);
  } catch (err: any) {
    console.error(`[${cat.name}] Gemini API or other error:`, err?.message || err);
  }
}

// リプライ投稿
async function createReplyPost(
  cat: CatPromptConfig,
  catId: string
): Promise<void> {
  const recentPosts = await getRecentPosts(5);
  if (recentPosts.length === 0) {
    // リプライ先がなければ通常投稿
    await createOriginalPost(cat, catId);
    return;
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
      buildReplyPrompt(cat, target.content, targetCatName)
    );
    const { error: insertError } = await supabaseAdmin.from("posts").insert({
      cat_id: catId,
      content,
      parent_id: target.id,
      post_type: "reply",
    });

    if (insertError) {
      console.error(`[${cat.name}] Supabase Insert Reply Error:`, insertError);
      return;
    }
    console.log(`[${cat.name}] → [${targetCatName}] リプライ完了`);
  } catch (err: any) {
    console.error(`[${cat.name}] Gemini API or other error in reply:`, err?.message || err);
  }
}

// ちゅ〜る受信後の特別リプライ生成
export async function createChuuruReaction(
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
      buildChuuruPrompt(cat, post.content)
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
    console.error("ちゅ〜るリアクション生成失敗:", err);
    return null;
  }
}
