const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for AI Generation
 * Limit: 20 requests per minute per org_id
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: (req) => {
    // We use orgId from our auth middleware as the key
    return req.auth?.orgId || req.ip;
  },
  message: {
    error: 'Too Many Requests',
    message: 'AI generation limit reached (20 req/min). Please try again shortly.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter };
