const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content')
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Posts found in DB:', data.length);
  data.forEach(p => console.log(`- [${p.id}] ${p.content.substring(0, 30)}`));
}

test();
