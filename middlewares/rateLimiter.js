import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import dotenv from "dotenv";

dotenv.config();

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Factory function to create a rate limit middleware
 * @param {string} prefix - Unique prefix for this rate limit (e.g., 'auth', 'booking')
 * @param {number} limit - Number of requests allowed
 * @param {string} window - Time window (e.g., '10s', '1m', '1h')
 */
export const createRateLimiter = (prefix, limit = 10, window = "10s") => {
  const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `@upstash/ratelimit/${prefix}`,
  });

  return async (req, res, next) => {
    try {
      // Use IP address as the identifier
      const identifier = req.ip || req.headers["x-forwarded-for"] || "anonymous";
      const { success, limit: total, remaining, reset } = await ratelimit.limit(identifier);

      // Set standard rate limit headers
      res.setHeader("X-RateLimit-Limit", total);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", reset);

      if (!success) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: new Date(reset).toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      // Fallback to allow request if rate limiter fails
      next();
    }
  };
};

// Pre-defined limiters
export const authLimiter = createRateLimiter("auth", 5, "1m"); // 5 requests per minute for auth
export const bookingLimiter = createRateLimiter("booking", 10, "1m"); // 10 bookings per minute
export const generalLimiter = createRateLimiter("general", 60, "1m"); // 60 requests per minute for others
