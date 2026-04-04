// config/bullConfig.js
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configure Redis connection for BullMQ.
 * We use IORedis as the underlying driver, which BullMQ requires.
 */
const redisOptions = {
  maxRetriesPerRequest: null,//
  enableReadyCheck: false,
};

// Use VALKEY_URL from environment
const connection = new IORedis(process.env.VALKEY_URL, redisOptions);

connection.on("error", (err) => {
  console.error("BullMQ Redis Connection Error:", err);
});

export default connection;
