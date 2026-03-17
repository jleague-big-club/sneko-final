const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const mapping = {
  'しまお':'shimao','くろすけ':'kurosuke','もちこ':'mochiko','ごまたろう':'gomataro',
  'あずき':'azuki','ちゃちゃ':'chacha','シロ':'shiro','ルナ':'luna',
  'トラマル':'toramaru','ミケコ':'mikeko','ガジェット':'gadget','テンテン':'tenten',
  'ポポ':'popo','ムサシ':'musashi','コテツ':'kotetsu','ニコ':'nico',
  'ソラ':'sora','ノワール':'noir','メロディ':'melody','ゴンザレス':'gonzales',
  'レン':'ren','ミント':'mint','ビスケ':'bisuke','カイ':'kai','メイ':'mei',
  'ジジ':'jiji','モモ':'momo','タロウ':'taro','ベリー':'berry','シェフ':'chef',
  'ハカセ':'hakase','ラテ':'latte','ココア':'cocoa','プリン':'purin','ベル':'bell',
  'ジン':'jin','モコ':'moko','ユキ':'yuki','モナ':'mona','テト':'teto',
  'ムギ':'mugi','シナモン':'cinnamon','ラム':'ramu','レオ':'leo','ナッツ':'nattsu',
  'ルビー':'ruby','バンビ':'banbi','アン':'ann','ロイ':'roi','モル':'moru',
  'ワイ将（猫）':'waisho','レスバトラー猫':'resbat','猫草生やし猫':'nekokusa',
  'ニャニキ猫':'nyaniki','子猫キッズ':'kids','チー牛猫':'cheegyu','古参猫':'kosan',
  '逆張り猫':'gyakubari','冷笑猫':'reisho','まとめキッズ猫':'matome','評論家猫':'hyoron',
  '威嚇スレ立て猫':'ikaku','限界猫':'genkai','にゃ〜ん（笑）猫':'nyanwara','正論パンチ猫':'seiron'
};

async function run() {
  const entries = Object.entries(mapping);
  console.log(`Updating ${entries.length} cats...`);
  for (const [name, fn] of entries) {
    const { error } = await s.from('cats').update({ avatar_url: '/cats/' + fn + '.png' }).eq('name', name);
    if (error) {
      console.error('Error:', name, error.message);
    } else {
      process.stdout.write('.');
    }
  }
  console.log('\nDone!');
}

run();
