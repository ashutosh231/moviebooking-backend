import { clearCache } from "./middlewares/cache.js";
import valkey from "./config/valkey.js";

async function run() {
  await clearCache("cache:/api/movies*");
  console.log("Movie cache cleared.");
  process.exit(0);
}

run();
