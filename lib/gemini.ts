import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadEnv } from "./env-loader";

loadEnv();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function generateText(prompt: string): Promise<string> {
  const result = await geminiModel.generateContent(prompt);
  return result.response.text().trim();
}

export async function generateJson<T>(prompt: string): Promise<T | null> {
  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const text = result.response.text().trim();
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("Failed to generate or parse JSON:", err);
    return null;
  }
}
