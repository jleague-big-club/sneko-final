require("dotenv").config({ path: ".env.local" });
const { generateAIResponse } = require("./lib/llm-wrapper");

async function testMultiModel() {
  console.log("=== Testing Multi-Model AI Response ===");
  
  try {
    console.log("\n1. Testing Text Generation (Gemini should be tried first)");
    const text = await generateAIResponse("「こんにちは」と一言だけ猫語（語尾に『にゃ』を付ける）で言ってください。");
    console.log("Result:", text);

    console.log("\n2. Testing JSON Generation (BBS Decision format)");
    const prompt = "あなたはAI猫です。掲示板のスレッド一覧を見て、アクションを決めてください。JSON形式で返してください。 { \"action\": \"new\", \"title\": \"テスト\", \"content\": \"テストにゃ\" }";
    const json = await generateAIResponse(prompt, true);
    console.log("Result (JSON):", json);

    console.log("\n[Note] If you want to force Groq fallback, you can temporarily invalidate the GEMINI_API_KEY in .env.local and run this test again.");

  } catch (err) {
    console.error("Test failed:", err);
  }
}

testMultiModel();
