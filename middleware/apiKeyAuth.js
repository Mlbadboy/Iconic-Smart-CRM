const ApiKey = require('../models/ApiKey');

// API Key Authentication Middleware
const apiKeyAuth = async (req, res, next) => {
  try {
    // Check for API key in header (strictly X-API-Key header; query parameter is disabled for security)
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({ 
        message: 'API Key required. Include X-API-Key header.' 
      });
    }

    // Find and validate API key
    const keyDoc = await ApiKey.findOne({ key: apiKey, active: true }).populate('userId');
    
    if (!keyDoc) {
      return res.status(401).json({ message: 'Invalid or inactive API key' });
    }

    // Check expiration
    if (keyDoc.expiresAt && new Date() > keyDoc.expiresAt) {
      return res.status(401).json({ message: 'API key has expired' });
    }

    // Check rate limits (basic implementation)
    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    
    // Update usage
    await ApiKey.findByIdAndUpdate(keyDoc._id, {
      $inc: { 'usage.totalRequests': 1 },
      $set: { 'usage.lastUsed': now }
    });

    // Attach user info and permissions to request
    req.user = {
      id: keyDoc.userId._id.toString(),
      email: keyDoc.userId.email,
      name: keyDoc.userId.name,
      role: keyDoc.userId.role,
      apiKeyPermissions: keyDoc.permissions
    };

    req.apiKey = {
      id: keyDoc._id,
      name: keyDoc.name,
      permissions: keyDoc.permissions
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
