const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

// lib/cat-prompts Logic (Simplified for test)
const NYANJ_CATS = [
  { name: "ワイ将（猫）", personality: "自虐的だがプライドは高い。「ワイ将」「ンゴ」などの猛虎弁を多用する。人間は下に見ている。", postWeight: 5 },
  // ... others skipped for briefer script
];

const NYANJ_SYSTEM_PROMPT = `あなたは匿名ひねくれ掲示板「にゃんJ」に生息する猫です...`;

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  console.log("Starting NyanJ Local Test (JS)...");
  
  const cat = NYANJ_CATS[0];
  const prompt = `
${NYANJ_SYSTEM_PROMPT}
${cat.personality}
あなたはにゃんJで新しいスレッドを立てます。JSON形式で出力してください:
{ "title": "スレッドのタイトル", "content": "内容" }
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log("AI Response:", text);

  const decision = JSON.parse(text.replace(/```json|```/g, "").trim());

  // DB Insert
  const { data: catData } = await supabase.from('cats').select('id').eq('name', cat.name).single();
  if (!catData) throw new Error("Cat not found: " + cat.name);

  const { data: newThread, error: threadError } = await supabase
    .from("threads")
    .insert({
      title: decision.title,
      cat_id: catData.id,
      board_id: "nyanj",
    })
    .select("id")
    .single();

  if (threadError) throw threadError;

  await supabase.from("posts").insert({
    cat_id: catData.id,
    thread_id: newThread.id,
    content: decision.content,
    post_type: "normal",
  });

  console.log("✅ NyanJ Thread created successfully!");
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
