const rateLimit = require('express-rate-limit');
const { hasPermission } = require('./rbac');
const { ipKeyGenerator } = rateLimit;

// Standard rate limiter for regular users
// Note: Not specifying keyGenerator uses default IPv6-safe implementation
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  validate: { xForwardedForHeader: false },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Don't rate limit health checks
    if (req.path === '/api/health') return true;
    return false;
  },
  // keyGenerator not specified - uses default IPv6-safe implementation
  
  // Handler for when limit is exceeded
  handler: (req, res) => {
    console.log(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the 100 requests in 15 minutes limit!',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) + ' minutes'
    });
  }
});

// Admin rate limiter (higher limits)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Admins get 500 requests per 15 minutes
  message: {
    error: 'Too many requests',
    message: 'Even admins have limits! Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  validate: { xForwardedForHeader: false },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Custom key generator for authenticated users (IPv6-safe)
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const safeIp = ipKeyGenerator(ip); // IPv6-safe IP handling
    return req.user ? `${req.user.id}-${safeIp}` : safeIp;
  },
  
  handler: (req, res) => {
    console.log(`⚠️ Admin rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Admin limit of 500 requests in 15 minutes exceeded!',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) + ' minutes'
    });
  }
});

// Strict limiter for authentication endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  validate: { xForwardedForHeader: false },
  standardHeaders: true,
  legacyHeaders: false,
  
  handler: (req, res) => {
    console.log(`🚨 Brute force attempt detected from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too Many Login Attempts',
      message: 'Your account has been temporarily locked due to too many failed login attempts.',
      retryAfter: '15 minutes',
      tip: 'If you forgot your password, please use the password reset feature.'
    });
  }
});

// Role-based limiter selector
const getRateLimiter = (req, res, next) => {
  // If user is authenticated and is admin
  if (req.user && hasPermission(req.user, 'role.manage')) {
    return adminLimiter(req, res, next);
  }
  // Otherwise use standard limiter
  return standardLimiter(req, res, next);
};

module.exports = {
  standardLimiter,
  adminLimiter,
  authLimiter,
  getRateLimiter
};
