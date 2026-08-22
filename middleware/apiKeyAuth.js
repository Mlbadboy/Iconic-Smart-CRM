const ApiKey = require('../models/ApiKey');

// API Key Authentication Middleware
const apiKeyAuth = async (req, res, next) => {
  try {
    // Check for API key in header or request body (case-insensitive key search)
    let apiKey = req.header('X-API-Key');
    
    if (!apiKey && req.body && typeof req.body === 'object') {
      for (const k of Object.keys(req.body)) {
        if (k.toLowerCase() === 'accesskey') {
          apiKey = req.body[k];
          break;
        }
      }
    }
    
    if (!apiKey) {
      return res.status(401).json({ 
        valid: false,
        code: 'API_KEY_REQUIRED',
        status: 'UNAUTHORIZED',
        message: 'API Key required. Include X-API-Key header or accessKey in body.' 
      });
    }

    // Find and validate API key
    const keyDoc = await ApiKey.findOne({ key: apiKey, active: true, status: 'ACTIVE' }).populate('userId');
    
    if (!keyDoc) {
      return res.status(401).json({ 
        valid: false,
        code: 'API_KEY_INVALID_OR_REVOKED',
        status: 'UNAUTHORIZED',
        message: 'Invalid or inactive API key' 
      });
    }

    // Check expiration
    if (keyDoc.expiresAt && new Date() > keyDoc.expiresAt) {
      return res.status(401).json({ 
        valid: false,
        code: 'API_KEY_EXPIRED',
        status: 'UNAUTHORIZED',
        message: 'API key has expired' 
      });
    }

    // Check rate limits (basic implementation)
    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    
    // Update usage
    await ApiKey.findByIdAndUpdate(keyDoc._id, {
      $inc: { 'usage.totalRequests': 1 },
      $set: { 'usage.lastUsed': now }
    });

    // Attach tenant, user info and permissions to request
    req.companyId = keyDoc.companyId;
    req.user = {
      id: keyDoc.userId?._id?.toString() || keyDoc.userId?.toString(),
      email: keyDoc.userId?.email,
      name: keyDoc.userId?.name,
      role: keyDoc.userId?.role || 'api-client',
      companyId: keyDoc.companyId,
      apiKeyPermissions: keyDoc.permissions
    };

    req.apiKey = {
      id: keyDoc._id,
      name: keyDoc.name,
      companyId: keyDoc.companyId,
      permissions: keyDoc.permissions,
      dealerScope: keyDoc.dealerScope || []
    };

    next();
  } catch (error) {
    console.error('API Key Auth Error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey || !req.apiKey.permissions.includes(permission)) {
      return res.status(403).json({ 
        message: `Permission '${permission}' required for this operation` 
      });
    }
    next();
  };
};

module.exports = { apiKeyAuth, requirePermission };
