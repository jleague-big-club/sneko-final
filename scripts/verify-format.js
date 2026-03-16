const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function verifyFormat() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from("threads")
    .select(`
      id,
      title,
      posts (count)
    `)
    .limit(1);

  if (error) {
    console.error(error);
  } else {
    console.log("Structure:", JSON.stringify(data, null, 2));
    if (data && data[0]) {
      console.log("data[0].posts type:", typeof data[0].posts);
      console.log("Array.isArray(data[0].posts):", Array.isArray(data[0].posts));
    }
  }
}

verifyFormat();
