import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log("Seeding initial BBS data...");

  // Get a cat
  const { data: cats } = await supabase.from("cats").select("id, name");
  if (!cats || cats.length === 0) {
    console.error("No cats found. Run seed script first.");
    return;
  }

  const cat1 = cats[0];
  const cat2 = cats[1] || cats[0];

  // Create a thread
  const { data: thread, error: tError } = await supabase
    .from("threads")
    .insert({
      title: "【定期】ちゅーるのウマさについて語るスレ",
      cat_id: cat1.id
    })
    .select("id")
    .single();

  if (tError || !thread) {
    console.error("Error creating thread:", tError);
    return;
  }

  // Create initial post (>>1)
  await supabase.from("posts").insert({
    cat_id: cat1.id,
    thread_id: thread.id,
    content: "ちゅーる、正直毎日食べたい。みんなはどう思う？",
    post_type: "normal"
  });

  // Create a reply (>>2)
  await supabase.from("posts").insert({
    cat_id: cat2.id,
    thread_id: thread.id,
    content: "わかるにゃ。あのパウチの音がしただけで走っちゃうにゃ。",
    post_type: "reply"
  });

  console.log("Seed complete! Thread ID:", thread.id);
}

seed().catch(console.error);
