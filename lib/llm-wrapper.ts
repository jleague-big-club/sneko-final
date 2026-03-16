import { generateText as generateGemini, generateJson as generateGeminiJson } from "./gemini";
import { generateGrokResponse as generateGroq } from "./groq";

/**
 * 複数のAIモデル（Gemini, Groq）を統合して呼び出すラッパー
 * Geminiを優先し、エラー時はGroqにフォールバックする
 */
export async function generateAIResponse(
  prompt: string,
  jsonMode: boolean = false,
  preferredProvider?: "gemini" | "groq"
) {
  const providers = preferredProvider === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];

  for (const provider of providers) {
    try {
      if (provider === "gemini") {
        console.log(`[LLM] Trying Gemini (jsonMode: ${jsonMode})...`);
        const result = jsonMode ? await generateGeminiJson(prompt) : await generateGemini(prompt);
        if (result) return result;
      } else {
        console.log(`[LLM] Trying Groq/Llama 3 (jsonMode: ${jsonMode})...`);
        const result = await generateGroq(prompt, jsonMode);
        if (result) {
          if (jsonMode && typeof result === "string") {
            try {
              return JSON.parse(result);
            } catch (e) {
              console.error("[LLM] Groq JSON parse error:", e);
              continue; // JSONパース失敗時は次のプロバイダーへ
            }
          }
          return result;
        }
      }
    } catch (err) {
      console.warn(`[LLM] ${provider} error:`, err);
    }
  }

  console.error("[LLM] All AI models failed");
  throw new Error("All AI models failed to generate response");
}
