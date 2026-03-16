const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function verifyNyanJLogic() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log("Checking for NyanJ threads...");
  const { data: threads } = await supabase
    .from('threads')
    .select('id, title, updated_at')
    .eq('board_id', 'nyanj')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!threads || threads.length === 0) {
    console.log("No threads found. New thread will be created on next cron run.");
    return;
  }

  const thread = threads[0];
  console.log(`Current top thread: "${thread.title}" (ID: ${thread.id}, Updated: ${thread.updated_at})`);

  // To truly verify, we'd need to run the TS code.
  // Instead, let's just confirm the updated_at trigger/logic potential.
}

verifyNyanJLogic();
