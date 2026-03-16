import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://uijjbmwhhldfbaelnonn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpampibXdoaGxkZmJhZWxub25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NjI3NzEsImV4cCI6MjA4OTEzODc3MX0.5kDr86GPXb8Lm_rbhMFxVWgnhDe2cAeYr7d-oATZFiA"
);

async function run() {
  console.log("Checking threads table...");
  const { data: threads, error } = await supabase.from("threads").select("count");
  console.log("Threads count:", threads?.[0]?.count ?? threads?.length);
  if (error) console.error("Error:", error);
}

run();
