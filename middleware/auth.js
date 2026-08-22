const jwt = require('jsonwebtoken');
const { hasPermission } = require('./rbac');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return process.env.JWT_SECRET;
};

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuth = (req, res, next) => {
  if (!hasPermission(req.user, 'role.manage')) return res.status(403).json({ message: 'Administrator access required' });
  next();
};

// Alias for adminAuth
const adminOnly = adminAuth;

module.exports = { auth, adminAuth, adminOnly };
