const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { hasPermission } = require('./rbac');
const { ipKeyGenerator } = rateLimit;

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
};

// Standard rate limiter for unauthenticated public/general requests
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit unauthenticated IP requests
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again after a few minutes',
    retryAfter: '15 minutes'
  },
  validate: { xForwardedForHeader: false },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip health check and auth login (handled by authLimiter)
    if (req.path === '/health' || req.path === '/api/health') return true;
    if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) return true;
    return false;
  },
  handler: (req, res) => {
    console.log(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the request limit! Please try again in a few minutes.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) + ' minutes'
    });
  }
});

// Authenticated user rate limiter (per user ID)
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per authenticated user
  message: {
    error: 'Too many requests',
    message: 'User request limit reached. Please slow down and try again shortly.',
    retryAfter: '15 minutes'
  },
  validate: { xForwardedForHeader: false },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const safeIp = ipKeyGenerator(ip);
    return req.user?.id ? `user-${req.user.id}` : safeIp;
  },
  handler: (req, res) => {
    console.log(`⚠️ User rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded your request limit. Please try again shortly.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) + ' minutes'
    });
  }
});

// Admin rate limiter (high capacity for administrators)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Admins get 2000 requests per 15 minutes
  message: {
    error: 'Too many requests',
    message: 'Admin request limit exceeded! Please try again shortly.',
    retryAfter: '15 minutes'
  },
  validate: { xForwardedForHeader: false },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const safeIp = ipKeyGenerator(ip);
    return req.user?.id ? `admin-${req.user.id}` : safeIp;
  },
  handler: (req, res) => {
    console.log(`⚠️ Admin rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Admin request limit exceeded! Please try again shortly.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) + ' minutes'
    });
  }
});

// Strict limiter for authentication endpoints (prevent brute force, skip successful logins)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 failed login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many login attempts',
    message: 'Too many failed login attempts. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  validate: { xForwardedForHeader: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`🚨 Brute force attempt detected from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too Many Login Attempts',
      message: 'Your IP has been temporarily rate-limited due to repeated failed login attempts.',
      retryAfter: '15 minutes',
      tip: 'Please check your credentials and try again.'
    });
  }
});

// Role-based limiter selector with pre-auth JWT extraction
const getRateLimiter = (req, res, next) => {
  // Dedicated authLimiter handles login and register directly
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    return next();
  }

  // Pre-decode JWT if present so authenticated users are not penalized as unauthenticated IPs
  if (!req.user) {
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = decoded;
      } catch (e) {}
    }
  }

  // If user is authenticated and is admin
  if (req.user) {
    const userRole = String(req.user.role || '').toLowerCase();
    if (['super-admin', 'superadmin', 'company-admin', 'admin'].includes(userRole) || hasPermission(req.user, 'role.manage')) {
      return adminLimiter(req, res, next);
    }
    return userLimiter(req, res, next);
  }

  // Otherwise use standard limiter for unauthenticated requests
  return standardLimiter(req, res, next);
};

module.exports = {
  standardLimiter,
  adminLimiter,
  userLimiter,
  authLimiter,
  getRateLimiter
};
