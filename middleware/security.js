const helmet = require('helmet');

// Configure Helmet with custom settings for production
// Note: CSP is permissive to allow React app and HTML pages to work
const securityHeaders = helmet({
  // Content Security Policy - Permissive for React and HTML compatibility
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:"], // Needed for React and HTML pages
      scriptSrcAttr: ["'unsafe-inline'"], // For inline event handlers in HTML
      styleSrc: ["'self'", "'unsafe-inline'", "data:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "http://localhost:*", "https://www.iconicsmart.co.in", "https://iconicsmart.co.in", "https://*"], // Allow API calls
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"], // Allow form submissions
      frameAncestors: ["'none'"], // Prevent embedding
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null, // Only in production
    },
  },
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disabled for compatibility with React
  
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: "same-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Frameguard (X-Frame-Options)
  frameguard: { action: "deny" }, // Prevent clickjacking
  
  // Hide Powered By (remove X-Powered-By header)
  hidePoweredBy: true, // Don't advertise we're using Express
  
  // HSTS (Strict-Transport-Security) - Only in production
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 15552000, // 180 days in seconds
    includeSubDomains: true,
    preload: true
  } : false,
  
  // IE No Open
  ieNoOpen: true,
  
  // X-Content-Type-Options
  noSniff: true, // Prevent MIME sniffing
  
  // Origin-Agent-Cluster
  originAgentCluster: true,
  
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  
  // Referrer Policy
  referrerPolicy: { policy: "no-referrer" },
  
  // X-XSS-Protection (disabled - CSP is better)
  xssFilter: false
});

// Custom middleware to log security headers (only in development)
const logSecurityHeaders = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔒 Security headers applied for: ${req.method} ${req.path}`);
  }
  next();
};

// Middleware to add custom security headers for API responses
const apiSecurityHeaders = (req, res, next) => {
  // Only apply to API routes
  if (req.path.startsWith('/api/')) {
    // Prevent caching of API responses (sensitive data)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add custom security header
    res.setHeader('X-API-Version', '1.0');
    
    // Prevent API responses from being displayed in iframe
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Add Content-Type security
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  next();
};

module.exports = {
  securityHeaders,
  logSecurityHeaders,
  apiSecurityHeaders
};

