const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { hasPermission, rolePermissions } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');

const router = express.Router();

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return process.env.JWT_SECRET;
};

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const allowedRoles = Object.keys(rolePermissions);

const validateRegistration = ({ name, email, password, role }) => {
  if (!name || !email || !password) return 'Name, email, and password are required';
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'A valid email address is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (role && !allowedRoles.includes(role)) return 'Invalid role';
  return null;
};

// Register users. The first account may bootstrap as admin; every later account requires an admin token.
router.post('/register', async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const requestedRole = req.body.role || 'user';
    const validationError = validateRegistration({ name, email, password, role: requestedRole });
    if (validationError) return res.status(400).json({ message: validationError });

    const existingCount = await User.estimatedDocumentCount();
    const authHeader = req.header('Authorization');
    let creator = null;

    if (existingCount > 0) {
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Admin authentication required to create users' });
      }
      try {
        creator = jwt.verify(authHeader.replace('Bearer ', ''), getJwtSecret());
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (!hasPermission(creator, 'user.create')) {
        return res.status(403).json({ message: 'Permission required: user.create' });
      }
    }

    const duplicate = await User.findOne({ email });
    if (duplicate) return res.status(409).json({ message: 'User with this email already exists' });

    const role = existingCount === 0 ? 'admin' : requestedRole;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name: name.trim(), email, password: hashedPassword, role });
    await user.save();
    await recordAuditEvent(req, {
      actorId: creator?.id || user._id,
      actorRole: creator?.role || 'bootstrap',
      action: 'user.create',
      entity: 'User',
      entityId: user._id,
      newValue: { name: user.name, email: user.email, role: user.role }
    });
    res.status(201).json({
      message: 'User registered',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    user.lastLogin = new Date();
    await user.save();
    await recordAuditEvent(req, {
      actorId: user._id,
      actorRole: user.role,
      action: 'auth.login',
      entity: 'User',
      entityId: user._id,
      newValue: { lastLogin: user.lastLogin }
    });
    const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify token
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user || !user.isActive) return res.status(401).json({ valid: false, message: 'Invalid token' });
    res.json({ valid: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

// Get current user (alias for verify)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid token' });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, department: user.department });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
