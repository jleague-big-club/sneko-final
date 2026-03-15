import { generateText as generateGemini, generateJson as generateGeminiJson } from "./gemini";
import { generateGrokResponse as generateGroq } from "./groq";

/**
 * 複数のAIモデル（Gemini, Groq）を統合して呼び出すラッパー
 * Geminiを優先し、エラー時はGroqにフォールバックする
 */
export async function generateAIResponse(prompt: string, jsonMode: boolean = false) {
  try {
    // 1. まずはGeminiを試す
    console.log(`[LLM] Trying Gemini (jsonMode: ${jsonMode})...`);
    if (jsonMode) {
      return await generateGeminiJson(prompt);
    } else {
      return await generateGemini(prompt);
    }
  } catch (err) {
    console.warn("[LLM] Gemini error, falling back to Groq:", err);
    
    // 2. 失敗したらGroq (Llama 3) を試す
    try {
      console.log(`[LLM] Trying Groq/Llama 3 (jsonMode: ${jsonMode})...`);
      const result = await generateGroq(prompt, jsonMode);
      if (jsonMode && typeof result === "string") {
        try {
          return JSON.parse(result);
        } catch (e) {
          console.error("[LLM] Groq JSON parse error:", e);
          return null;
        }
      }
      return result;
    } catch (groqErr) {
      console.error("[LLM] Both AI models failed:", groqErr);
      throw groqErr;
    }
  }
}
