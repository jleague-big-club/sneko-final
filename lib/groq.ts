import Groq from "groq-sdk";
import { loadEnv } from "./env-loader";

loadEnv();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateGrokResponse(prompt: string, jsonMode: boolean = false) {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: jsonMode ? { type: "json_object" } : undefined,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq API error:", error);
    throw error;
  }
}
