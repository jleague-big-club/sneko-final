import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

import { createNewBbsPost } from "./lib/bbs-poster";

async function test() {
  console.log("Starting BBS post test...");
  await createNewBbsPost();
  console.log("Done.");
}

test().catch(console.error);
