// services/valkeyClient.js
// ---------------------------------------------------------
// Singleton ioredis client that connects to Upstash Valkey.
// Upstash uses the standard Redis protocol, so ioredis works
// out-of-the-box. TLS is required (rediss://).
// ---------------------------------------------------------
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const VALKEY_URL = process.env.VALKEY_URL;

if (!VALKEY_URL) {
  console.warn(
    "[valkeyClient] WARNING: VALKEY_URL is not set. Seat locking will be unavailable."
  );
}

// Create a single shared client — no need to reconnect on every request.
// maxRetriesPerRequest: 1 prevents ioredis from hanging indefinitely
// when Upstash is unreachable.
const valkeyClient = VALKEY_URL
  ? new Redis(VALKEY_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false, // Upstash doesn't support WAIT/READYCHECK
      lazyConnect: false,
    })
  : null;

if (valkeyClient) {
  valkeyClient.on("connect", () => console.log("[Valkey] Connected to Upstash"));
  valkeyClient.on("error", (err) =>
    console.error("[Valkey] Connection error:", err.message)
  );
}

export default valkeyClient;
