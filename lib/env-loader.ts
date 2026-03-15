import dotenv from "dotenv";
import path from "path";

let loaded = false;

export function loadEnv() {
  if (loaded || typeof window !== 'undefined') return;
  try {
    dotenv.config({ path: path.join(process.cwd(), ".env.local") });
    loaded = true;
    console.log("[EnvLoader] .env.local loaded.");
  } catch (e) {
    console.error("[EnvLoader] Failed to load .env.local:", e);
  }
}
