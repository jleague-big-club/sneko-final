const { createNewBbsPost } = require('../lib/bbs-poster');
const { supabaseAdmin } = require('../lib/supabase');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function traceNyanJPost() {
  console.log("--- NyanJ Trace Start ---");
  
  // 1. Check if we have active threads
  const { data: threads } = await supabaseAdmin
    .from("threads")
    .select(`id, title, board_id, updated_at, posts(count)`)
    .eq("board_id", "nyanj")
    .order("updated_at", { ascending: false })
    .limit(10);
    
  console.log("Active Threads Count:", threads?.length || 0);
  if (threads) {
    threads.forEach(t => {
      console.log(`Thread: [${t.id}] "${t.title}" (Posts: ${t.posts?.[0]?.count}, Updated: ${t.updated_at})`);
    });
  }

  // 2. Run the actual logic (mocking random for 100% reply if possible, 
  // but since we can't easily mock Math.random in this context without more work, 
  // we'll just run it a few times until we hit a reply)
  
  console.log("\nAttempting createNewBbsPost('nyanj')...");
  const result = await createNewBbsPost('gemini', 'nyanj');
  console.log("Execution Result:", JSON.stringify(result, null, 2));

  console.log("--- NyanJ Trace End ---");
}

traceNyanJPost();
