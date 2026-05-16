let Redis;
try {
  Redis = require("ioredis");
} catch (e) {
  Redis = null;
}

const inMemoryAttempts = new Map();

function inMemoryLimiter({ windowMs = 15 * 60 * 1000, maxAttempts = 10 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const now = Date.now();
    const entry = inMemoryAttempts.get(key) || { count: 0, first: now };
    if (now - entry.first > windowMs) {
      entry.count = 0;
      entry.first = now;
    }
    entry.count++;
    inMemoryAttempts.set(key, entry);
    if (entry.count > maxAttempts) return res.status(429).json({ message: "Too many requests" });
    next();
  };
}

module.exports = function redisRateLimiter({
  windowSec = 60,
  maxAttempts = 10,
  prefix = "rl:",
} = {}) {
  if (!process.env.REDIS_URL || !Redis) {
    return inMemoryLimiter({ windowMs: windowSec * 1000, maxAttempts });
  }

  const client = new Redis(process.env.REDIS_URL);
  return async (req, res, next) => {
    try {
      const key = `${prefix}${req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress}`;
      const v = await client.incr(key);
      if (v === 1) {
        await client.expire(key, windowSec);
      }
      if (v > maxAttempts) {
        return res.status(429).json({ message: "Too many requests" });
      }
    } catch (e) {
      // Redis issues should not block requests; fall back silently
    }
    next();
  };
};
