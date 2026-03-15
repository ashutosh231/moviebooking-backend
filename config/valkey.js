// config/valkey.js
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

// Connect to the Valkey URL from environment variables.
// If missing, use localhost default (or you can choose not to connect).
const VALKEY_URL = process.env.VALKEY_URL || "redis://localhost:6379";

const valkey = new Redis(VALKEY_URL, {
  // Retry strategy: wait up to 2 seconds before retrying
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  },
  // If connection fails, log it but don't crash the whole app immediately
  maxRetriesPerRequest: 3
});

valkey.on("connect", () => {
  console.log(`✅ Connected to Valkey cache at ${VALKEY_URL.split('@').pop()}`);
});

valkey.on("error", (err) => {
  console.error("❌ Valkey connection error:", err.message);
});

export default valkey;
