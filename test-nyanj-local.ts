import { createNewBbsPost } from "./lib/bbs-poster";
import { loadEnv } from "./lib/env-loader";

async function test() {
  loadEnv();
  console.log("Starting NyanJ Local Test...");
  const result = await createNewBbsPost("gemini", "nyanj");
  console.log("Result:");
  console.dir(result, { depth: null });
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
