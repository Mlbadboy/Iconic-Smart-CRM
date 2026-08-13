# 🛡️ IMPLEMENTATION #1: RATE LIMITING

**Priority**: Quick Win (High Impact, Low Effort)  
**Time Estimate**: 30 minutes  
**Status**: ✅ Ready to Implement

---

## 📋 WHAT IS RATE LIMITING?

Rate limiting prevents users from making too many API requests in a short time. This protects your server from:
- **DDoS attacks** (Denial of Service)
- **Brute force login attempts**
- **API abuse**
- **Resource exhaustion**

### Example Without Rate Limiting:
```
Bad Actor → 10,000 requests/second → Server Crashes ❌
```

### Example With Rate Limiting:
```
Bad Actor → 10,000 requests/second → Only 100 allowed → Server Safe ✅
```

---

## 🎯 IMPLEMENTATION STRATEGY

### Two-Tier System:
1. **Standard Users**: 100 requests per 15 minutes
2. **Admin Users**: 500 requests per 15 minutes (higher limit)

### Why Different Limits?
- Admins need to run reports, manage data = more requests
- Regular users just view/create orders = fewer requests

---

## 💻 CODE IMPLEMENTATION

### Step 1: Install Package
```bash
npm install express-rate-limit
```

### Step 2: Create Rate Limit Middleware

**File**: `middleware/rateLimiter.js`

```javascript
const rateLimit = require('express-rate-limit');

// Standard rate limiter for regular users
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Don't rate limit health checks
    if (req.path === '/api/health') return true;
    return false;
  },
  
  // Custom key generator (by IP address)
  keyGenerator: (req) => {
    return req.ip;
  },
  
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
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req) => {
    // Use user ID + IP for authenticated requests
    return req.user ? `${req.user.id}-${req.ip}` : req.ip;
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
  if (req.user && req.user.role === 'admin') {
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

// Import rate limiters
const { authLimiter, getRateLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();

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

// Apply strict rate limiting to auth routes (prevent brute force)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Apply role-based rate limiting to all other API routes
app.use('/api', getRateLimiter);

// API Routes (these are now protected by rate limiting)
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
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

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
  console.log(`🛡️ Rate limiting enabled: 100 req/15min (users), 500 req/15min (admins)\n`);
});
```

---

## 📊 HOW IT WORKS

### User Makes Request
```
User → API Request → Rate Limiter Checks:
                      ↓
        Has user exceeded limit?
        ↓                    ↓
       YES                  NO
        ↓                    ↓
    Return 429           Allow Request
    (Too Many            Continue to
     Requests)           Route Handler
```

### Admin vs User Example
```
Regular User:
- Makes 50 requests → ✅ Allowed
- Makes 100 requests → ✅ Allowed (at limit)
- Makes 101 requests → ❌ Blocked (429 error)

Admin User:
- Makes 100 requests → ✅ Allowed
- Makes 500 requests → ✅ Allowed (at limit)
- Makes 501 requests → ❌ Blocked (429 error)
```

### Login Protection
```
Failed Login Attempts:
1. First attempt → ✅ Allowed
2. Second attempt → ✅ Allowed
3. Third attempt → ✅ Allowed
4. Fourth attempt → ✅ Allowed
5. Fifth attempt → ✅ Allowed
6. Sixth attempt → ❌ Blocked for 15 minutes
```

---

## 🧪 TESTING

### Test Standard User Limit
```bash
# Make 101 requests quickly
for i in {1..101}; do
  curl http://localhost:7000/api/orders \
    -H "Authorization: Bearer YOUR_USER_TOKEN"
done

# Request 101 should return:
# {"error":"Too Many Requests","message":"You have exceeded..."}
```

### Test Admin Limit
```bash
# Admins can make 500 requests
for i in {1..501}; do
  curl http://localhost:7000/api/orders \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
done

# Request 501 should be blocked
```

### Test Login Brute Force Protection
```bash
# Try 6 failed logins
for i in {1..6}; do
  curl -X POST http://localhost:7000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}'
done

# 6th attempt returns 429 error
```

---

## 📈 RESPONSE HEADERS

When rate limiting is active, these headers are included:

```
RateLimit-Limit: 100              (Max requests allowed)
RateLimit-Remaining: 47           (Requests left)
RateLimit-Reset: 1699102800       (Unix timestamp when limit resets)
```

### Client can check these headers:
```javascript
fetch('/api/orders', {
  headers: { 'Authorization': 'Bearer token' }
})
.then(response => {
  const remaining = response.headers.get('RateLimit-Remaining');
  const limit = response.headers.get('RateLimit-Limit');
  
  console.log(`Requests remaining: ${remaining}/${limit}`);
  
  if (remaining < 10) {
    alert('⚠️ You are approaching your rate limit!');
  }
});
```

---

## 🎨 USER-FRIENDLY ERROR HANDLING

### Frontend Integration (Add to all HTML pages)

```javascript
// Add this to your API call functions
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // Check if rate limited
    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = data.retryAfter || '15 minutes';
      
      showToast(`⚠️ Rate Limit Exceeded! Please wait ${retryAfter}`, 'error');
      
      // Optionally show a modal with countdown
      showRateLimitModal(retryAfter);
      
      return null;
    }
    
    // Check remaining requests
    const remaining = response.headers.get('RateLimit-Remaining');
    if (remaining && parseInt(remaining) < 10) {
      console.warn(`⚠️ Only ${remaining} requests remaining!`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showToast('❌ Request failed', 'error');
    return null;
  }
}

function showRateLimitModal(retryAfter) {
  // Show a user-friendly modal
  const modal = `
    <div class="rate-limit-modal">
      <h2>⏸️ Too Many Requests</h2>
      <p>You've reached the request limit. This helps keep our servers fast for everyone!</p>
      <p><strong>Please wait: ${retryAfter}</strong></p>
      <p>💡 Tip: Refresh the page after the wait time.</p>
    </div>
  `;
  // Display modal...
}
```

---

## 🔧 CUSTOMIZATION OPTIONS

### Change Limits Per Route
```javascript
// In server.js, apply different limits to specific routes

// Stricter limit for expensive operations
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 report generations per 15 minutes
  message: 'Report generation limit reached'
});

app.use('/api/reports', reportLimiter);
```

### Change Time Windows
```javascript
// 1 hour window instead of 15 minutes
windowMs: 60 * 60 * 1000, // 1 hour
max: 1000 // 1000 requests per hour
```

### IP + User Combined Limiting
```javascript
keyGenerator: (req) => {
  // Combine IP and user ID for more granular control
  return req.user ? `${req.user.id}-${req.ip}` : req.ip;
}
```

---

## ✅ BENEFITS

1. **🛡️ Security**: Prevents brute force attacks on login
2. **⚡ Performance**: Prevents server overload
3. **💰 Cost Saving**: Reduces unnecessary API calls
4. **🎯 Fair Usage**: Ensures resources shared fairly
5. **📊 Monitoring**: See who's making too many requests

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Install `express-rate-limit` package
- [ ] Create `middleware/rateLimiter.js`
- [ ] Update `server.js` with rate limiters
- [ ] Test with curl/Postman (make 100+ requests)
- [ ] Update frontend to handle 429 errors
- [ ] Test admin vs user limits
- [ ] Test login brute force protection
- [ ] Monitor logs for rate limit violations
- [ ] Document limits in API documentation

---

## 📚 RESOURCES

- **Package**: https://www.npmjs.com/package/express-rate-limit
- **HTTP 429 Status**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429
- **Best Practices**: https://blog.logrocket.com/rate-limiting-node-js/

---

**Next Implementation**: [Helmet.js Security Headers](#)  
**Previous**: [Feature Status Report](FEATURE_STATUS_REPORT.md)
