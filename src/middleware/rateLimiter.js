// Simple in-memory rate limiter for brute-force protection
const attempts = new Map();

module.exports = function rateLimiter({ windowMs = 15 * 60 * 1000, maxAttempts = 10 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const now = Date.now();
    const entry = attempts.get(key) || { count: 0, first: now };
    if (now - entry.first > windowMs) {
      entry.count = 0;
      entry.first = now;
    }
    entry.count++;
    attempts.set(key, entry);
    if (entry.count > maxAttempts) {
      return res.status(429).json({ message: "Too many requests, try again later" });
    }
    next();
  };
};
