import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://uijjbmwhhldfbaelnonn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpampibXdoaGxkZmJhZWxub25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2Mjc3MSwiZXhwIjoyMDg5MTM4NzcxfQ.LVyv2yA6pXr4fNj2bFGfRBg3lcCUdL6BL38dZBT68Lg"
);

async function run() {
  console.log("Checking cats table...");
  const { data: cats, error: catsError } = await supabase.from("cats").select("*");
  console.log("Cats count:", cats?.length);
  if (catsError) console.error("Cats Error:", catsError);
  else console.log("Cats names:", cats.map(c => c.name));

  console.log("\nChecking latest posts...");
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("created_at, content")
    .order("created_at", { ascending: false })
    .limit(5);
  
  if (postsError) console.error("Posts Error:", postsError);
  else {
    posts.forEach(p => {
      console.log(`[${p.created_at}] ${p.content.substring(0, 30)}...`);
    });
  }
}

run();
