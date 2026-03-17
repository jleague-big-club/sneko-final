const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testGetActiveThreads() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const boardId = 'bbs';
  
  const { data, error } = await supabase
    .from("threads")
    .select(`
      id,
      title,
      cats (
        name
      ),
      posts (count)
    `)
    .eq("board_id", boardId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Fetch error:", error);
    return;
  }

  console.log("Raw Data:", JSON.stringify(data, null, 2));

  const filtered = data
    .filter((t) => {
      const postCount = t.posts?.[0]?.count ?? 0;
      console.log(`Thread "${t.title}" post count: ${postCount}`);
      return postCount < 50;
    });

  console.log(`Filtered count: ${filtered.length}`);
}

testGetActiveThreads();
