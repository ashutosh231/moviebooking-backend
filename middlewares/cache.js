// middlewares/cache.js
import valkey from "../config/valkey.js";

/**
 * Middleware to cache the response of a route.
 * @param {number} durationInSeconds - How long the response should be cached
 */
export const cacheMiddleware = (durationInSeconds = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Use the full URL as the unique cache key
    const key = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await valkey.get(key);

      if (cachedResponse) {
        // Return instantly from Valkey
        return res.status(200).json(JSON.parse(cachedResponse));
      } else {
        // Intercept res.json to save the response to cache before sending it
        const originalJson = res.json.bind(res);
        res.json = (body) => {
          // Fire-and-forget storing into Valkey
          valkey.setex(key, durationInSeconds, JSON.stringify(body)).catch(err => {
             console.error("Valkey setex error:", err.message);
          });
          
          return originalJson(body);
        };
        next();
      }
    } catch (err) {
      // If Valkey fails entirely, silently bypass cache and hit DB
      console.error("Cache middleware error:", err.message);
      next();
    }
  };
};

/**
 * Helper to delete specific cache keys (e.g. when updating data)
 * @param {string} pattern - Pattern to clear, e.g., 'cache:/api/movies*'
 */
export const clearCache = async (pattern) => {
  try {
    const keys = await valkey.keys(pattern);
    if (keys.length > 0) {
      await valkey.del(keys);
      console.log(`Cleared ${keys.length} cache keys for pattern: ${pattern}`);
    }
  } catch (err) {
    console.error("Failed to clear cache:", err.message);
  }
};
