const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkSchema() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'threads' });
  
  if (error) {
    // If RPC doesn't exist, try a simple select
    console.log("RPC failed, trying direct select limit 1");
    const { data: sample, error: selectError } = await supabase.from('threads').select('*').limit(1);
    if (selectError) {
      console.error(selectError);
    } else {
      console.log("Sample thread:", JSON.stringify(sample, null, 2));
    }
  } else {
    console.log("Schema:", JSON.stringify(data, null, 2));
  }
}

checkSchema();
