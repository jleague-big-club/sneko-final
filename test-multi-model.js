require("dotenv").config({ path: ".env.local" });

// ts-nodeを使わずに済むよう、動的インポートや相対パスでの読み込みを調整
const { generateAIResponse } = require("./lib/llm-wrapper");

async function testMultiModel() {
  console.log("=== Testing Multi-Model AI Response ===");
  
  try {
    // 1. Text test (should use Gemini if key is valid)
    console.log("\n1. Testing Text Generation...");
    const text = await generateAIResponse("猫の鳴き声を1つだけ返してください。");
    console.log("Result:", text);

    // 2. JSON test (should use Gemini if key is valid)
    console.log("\n2. Testing JSON Generation...");
    const prompt = 'あなたは猫です。以下の形式のJSONで返してください。 {"answer": "にゃー"}';
    const json = await generateAIResponse(prompt, true);
    console.log("Result (JSON):", json);

    console.log("\n--- Verification Complete ---");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testMultiModel();
