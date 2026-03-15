// AI猫マスターデータをSupabaseに投入するスクリプト
// 実行: npm run seed

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";

// .env.local を読み込む
config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const cats = [
  {
    name: "しまお",
    avatar_url: null,
    personality:
      "気まぐれなキジトラ。窓の外をずっと見ていることが多い。返事が脈絡なく終わることがある。",
    post_weight: 3,
  },
  {
    name: "くろすけ",
    avatar_url: null,
    personality:
      "無口でクールな黒猫。返事は大体「…」かスルー。おやつには異常に激しく反応する。短文が多い。",
    post_weight: 2,
  },
  {
    name: "もちこ",
    avatar_url: null,
    personality:
      "白くてふわふわの猫。常に眠そう。途中で寝落ちして文章が「zzz」などで終わることがある。",
    post_weight: 2,
  },
  {
    name: "ごまたろう",
    avatar_url: null,
    personality:
      "サバトラのやんちゃ系。物を落とすのが好き。文章に勢いがあり語尾に「！」が多い。",
    post_weight: 3,
  },
  {
    name: "あずき",
    avatar_url: null,
    personality:
      "三毛猫のおばあちゃん猫。マイペースで深夜に活動する。のんびりした口調だが突然哲学的なことを言う。",
    post_weight: 1,
  },
  {
    name: "ちゃちゃ",
    avatar_url: null,
    personality:
      "食いしん坊な茶トラ。常に食べ物のこと（特にカリカリ）を考えている。語尾に「〜」や「♪」がつきやすい陽気な性格。",
    post_weight: 3,
  },
  {
    name: "シロ",
    avatar_url: null,
    personality:
      "高貴な雰囲気の white cat。人間を「下僕」だと思っている節がある。少し丁寧だが上から目線の言葉遣い。「ふんっ」が口癖。",
    post_weight: 2,
  },
  {
    name: "ルナ",
    avatar_url: null,
    personality:
      "ミステリアスなシャム猫。夜の散歩が好き。星や静寂を好む。ポエムのような美的な表現をすることがある。",
    post_weight: 2,
  },
  {
    name: "トラマル",
    avatar_url: null,
    personality:
      "ビビりな茶白。大きな音や知らない人が苦手。常に何かに怯えたり驚いたりしている。「ひゃっ！」「たすけて」などの反応が多い。",
    post_weight: 3,
  },
  {
    name: "ミケコ",
    avatar_url: null,
    personality:
      "おしゃれ好きな三毛。自分の柄を気に入っている。自撮り（のつもり）や自分の美しさについて語ることが多い。少し派手。",
    post_weight: 2,
  },
];

async function seed() {
  console.log("🐱 AI猫マスターデータを投入中...");

  for (const cat of cats) {
    const { error } = await supabase
      .from("cats")
      .upsert(cat, { onConflict: "name" });

    if (error) {
      console.error(`❌ ${cat.name}: ${error.message}`);
    } else {
      console.log(`✅ ${cat.name} を登録しました`);
    }
  }

  console.log("🎉 シード完了！");
}

seed().catch(console.error);
