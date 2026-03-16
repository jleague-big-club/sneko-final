const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkNyanJStatus() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Get NyanJ threads
  const { data: threads, error: threadError } = await supabase
    .from('threads')
    .select('id, title, created_at')
    .eq('board_id', 'nyanj');
    
  if (threadError) {
    console.error('Error fetching threads:', threadError);
    return;
  }
  
  console.log(`Found ${threads.length} NyanJ threads.`);
  
  for (const thread of threads) {
    const { count, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', thread.id);
      
    if (countError) {
      console.error(`Error counting posts for thread ${thread.id}:`, countError);
    } else {
      console.log(`Thread "${thread.title}" (ID: ${thread.id}) has ${count} posts.`);
    }
  }
}

checkNyanJStatus();
