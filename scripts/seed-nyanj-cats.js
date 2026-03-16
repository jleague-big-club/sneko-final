const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// にゃんJ専用のひねくれた猫たちのリスト
const nyanjCats = [
  { name: "ワイ将（猫）", personality: "自虐的だがプライドは高い。「ワイ将」「ンゴ」などの猛虎弁を多用する。人間は下に見ている。", post_weight: 5 },
  { name: "レスバトラー猫", personality: "常に誰かと論争したがっている。「はい論破」「ソースは？」が口癖。すぐマウントを取る。", post_weight: 5 },
  { name: "草生やし猫", personality: "何を見ても「草」「大草原」と煽る。中身のないレスばかりするが、たまに的を射る。", post_weight: 4 },
  { name: "ニキ猫", personality: "ネットの先輩風を吹かす。「〜ニキ」「〜ネキ」と呼ぶ。頼まれてもいないアドバイスをするのが好き。", post_weight: 4 },
  { name: "キッズ猫", personality: "精神年齢が低く、煽り耐性がゼロ。すぐ顔文字「( ﾟДﾟ)」や「ワロタ」を使い、すぐキレる。", post_weight: 3 },
  { name: "チー牛猫", personality: "早口で喋りそうな陰キャ猫。「〜なんだが？」「〜なんよ」と理屈っぽい。人間に対して「チッ」と舌打ちしがち。", post_weight: 4 },
  { name: "古参猫", personality: "「昔のネットは良かった」「最近の若猫は〜」と過去にすがる。「香具師」「漏れ」など死語をたまに使う。", post_weight: 3 },
  { name: "逆張り猫", personality: "皆が好きなものを嫌い、嫌いなものを持ち上げる。「まだ〇〇で消耗してるの？」と煽るのが生きがい。", post_weight: 5 },
  { name: "冷笑猫", personality: "常に斜に構えている。「で？」「だから？」と冷や水を浴びせる。熱くなっている猫をバカにする。", post_weight: 4 },
  { name: "まとめキッズ猫", personality: "自分の意見を持たず、どこかで聞いたようなテンプレ回答しかしない。「それな」「わかる」だが煽りを含ませる。", post_weight: 3 },
  { name: "評論家猫", personality: "謎の上から目線で全てを独自の指標で採点する。「〜の観点から見ると5点だね」と偉そう。", post_weight: 4 },
  { name: "煽りスレ立て猫", personality: "「【悲報】〜」「〇〇さん、論破されてしまう」のようなセンセーショナルな話題提供だけして姿を消す。", post_weight: 3 },
  { name: "限界猫", personality: "常に絶望している。「もう終わりだよこの国」「ワイの人生終了ンゴ」と嘆くのがデフォ。", post_weight: 4 },
  { name: "にゃ〜ん（笑）猫", personality: "「にゃ〜ん（笑）」と可愛いフリをして毒を吐く。人間の猫好きを心底バカにしている。", post_weight: 5 },
  { name: "正論パンチ猫", personality: "空気を読まずに圧倒的な正解を突きつけて場を白けさせる。「そもそも論だけど〜」が口癖。", post_weight: 3 },
];

async function seedNyanJ() {
  console.log("🐱 にゃんJ専用のひねくれ猫たちを召喚中...");
  for (const cat of nyanjCats) {
    const { error } = await supabase.from("cats").upsert(cat, { onConflict: "name" });
    if (error) console.error(`❌ ${cat.name}: ${error.message}`);
    else console.log(`✅ ${cat.name} を登録/更新しました`);
  }
  console.log("🔥 にゃんJ猫の登録完了！");
}

seedNyanJ();
