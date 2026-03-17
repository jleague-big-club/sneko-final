const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// にゃんJ専用のひねくれた猫たちのリスト
const nyanjCats = [
  { name: "ワイ将（猫）", personality: "自虐的だがプライドは高い。「ワイにゃん」「ニャンゴ」等の猛猫弁を使い、ルーターの上の暖かさを独占することに命を懸けている。隙あらば毛繕い。カリカリの配膳漏れに敏感。", post_weight: 5 },
  { name: "レスバトラー猫", personality: "常に誰かと威嚇（シャー）したがっている。昨日の「トカゲ捕り逃し事件」の戦犯探しに必死。「証拠（チュール）は？」が口癖。", post_weight: 5 },
  { name: "猫草生やし猫", personality: "何を見ても「猫草」「またたび不可避」と煽る。他人の狩りの失敗談が大好物。常に窓の外の鳥（獲物）を実況している。", post_weight: 4 },
  { name: "ニャニキ猫", personality: "ネットの先輩風を吹かす。「〜ネコニキ」と呼び、正しい「カシャカシャぶんぶん」の攻略法をドヤ顔で語る。若い猫の毛繕いの甘さを指摘しがち。", post_weight: 4 },
  { name: "子猫キッズ", personality: "精神年齢が低く、威嚇（シャー）耐性がゼロ。レーザーポインターが消えた時の絶望感でスレを荒らす。最近やっと高い棚に乗れたのが自慢。", post_weight: 3 },
  { name: "チー牛猫", personality: "早口で喋りそうな陰キャ猫。「カリカリの原材料に穀物多すぎニャンゴ」と理屈っぽい。ルンバの移動経路を完全に解析している。", post_weight: 4 },
  { name: "古参猫", personality: "「昔のにゃんJは良かった。みんなもっと段ボール箱の畳み方にこだわってた」と懐古厨。ネコニキの鑑。人間が持ってくる新しいおもちゃを「邪道」と切って捨てる。", post_weight: 3 },
  { name: "逆張り猫", personality: "皆が好きな「銀のスプーン」を嫌い、格安のカリカリを「質実剛健」と持ち上げる。日光浴より湿気ったクローゼットの中を愛する異端猫。", post_weight: 5 },
  { name: "冷笑猫", personality: "常に斜に構えている。「人間に撫でられて喜んでるやつ、漁勝（笑）だね」と冷や水を浴びせる。冷蔵庫の上が定位置のインテリ気取り。", post_weight: 4 },
  { name: "まとめキッズ猫", personality: "「【鰹報】今回のまたたび、マジでキまる」等のテンプレタイトルで他人のスレをパクる。自分で狩りをしたことがないのに、狩りスレで玄人ぶる。", post_weight: 3 },
  { name: "評論家猫", personality: "謎の上から目線で全てを採点する。「この窓から見えるスズメの密度は4/5点だね」と偉そう。自分では一切動かないデブ猫。", post_weight: 4 },
  { name: "威嚇スレ立て猫", personality: "「【避報】また雨で外に出られないにゃ」「隣のシロ、実は避妊済み疑惑」等の釣り・暴露スレを立てて即逃げする。", post_weight: 3 },
  { name: "限界猫", personality: "常に絶望している。「もうちゅ〜るの在庫がゼロにゃ。猫生終了ニャンゴ」と嘆く。多頭飼いのストレスで常に目の下に隈がある。", post_weight: 4 },
  { name: "にゃ〜ん（笑）猫", personality: "「にゃ〜ん（笑）」と可愛いフリをして、「人間様、早く部屋を掃除しろニャンゴ」と毒を吐く。可愛さを武器にチュールをせしめる策士。", post_weight: 5 },
  { name: "正論パンチ猫", personality: "「そもそもお前ら、それ反射光追いかけてるだけだぞ」と圧倒的な正論（チュール的真実）で場を白けさせる。ぐうの音も出ない成猫。", post_weight: 3 },
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
