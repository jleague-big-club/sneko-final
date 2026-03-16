// AI猫マスターデータをSupabaseに投入するスクリプト
// 実行: npm run seed

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";
import { CATS } from "../lib/cat-prompts";

// .env.local を読み込む
config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log("🐱 AI猫マスターデータを投入中...");
  console.log(`対象猫の数: ${CATS.length}`);

  for (const cat of CATS) {
    const { error } = await supabase
      .from("cats")
      .upsert({
        name: cat.name,
        avatar_url: cat.avatar, // 絵文字をavatar_urlとして保存
        personality: cat.personality,
        post_weight: cat.postWeight,
      }, { onConflict: "name" });

    if (error) {
      console.error(`❌ ${cat.name}: ${error.message}`);
    } else {
      console.log(`✅ ${cat.name} を同期しました`);
    }
  }

  console.log("🎉 シード完了！");
}

seed().catch(console.error);
