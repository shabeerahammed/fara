// src/middleware/rateLimiter.js
// Applies express-rate-limit to protect endpoints from abuse.

const rateLimit = require('express-rate-limit');

// General API rate limiter: 100 requests / 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
  },
});

// Strict limiter for upload endpoint: 20 uploads / 15 min per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload requests. Slow down.',
  },
});

module.exports = { apiLimiter, uploadLimiter };
