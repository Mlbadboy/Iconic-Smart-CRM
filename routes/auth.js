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
    const { resolveTenantFromHost } = require('../services/tenantResolver');
    const hostInfo = await resolveTenantFromHost(req);

    // If accessing on a tenant subdomain, check tenant lifecycle
    if (hostInfo.company) {
      if (hostInfo.company.status === 'SUSPENDED') {
        return res.status(403).json({ 
          message: 'Tenant subscription is suspended. Please contact your company administrator or platform support.',
          code: 'TENANT_SUSPENDED'
        });
      }
      if (hostInfo.company.status === 'DEACTIVATED' || !hostInfo.company.isActive) {
        return res.status(403).json({ 
          message: 'This tenant workspace is inactive.',
          code: 'TENANT_INACTIVE'
        });
      }
    }

    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check account lockout status
    if (user.isLocked || user.status === 'LOCKED') {
      return res.status(423).json({
        message: 'Your account has been temporarily locked due to too many failed login attempts. Please contact your company administrator to unlock your account.',
        code: 'ACCOUNT_LOCKED',
        lockReason: user.lockReason || 'Too many failed login attempts',
        failedLoginAttempts: user.failedLoginAttempts || 5
      });
    }

    // Check soft-deactivation / active state
    if (user.status === 'DISABLED' || !user.isActive) {
      return res.status(403).json({
        message: 'This user account has been deactivated. Please contact your company administrator.',
        code: 'USER_DISABLED'
      });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      user.failedLoginAttempts = attempts;

      if (attempts >= 5) {
        user.isLocked = true;
        user.status = 'LOCKED';
        user.lockReason = 'Too many failed login attempts';
        await user.save();

        await recordAuditEvent(req, {
          actorId: user._id,
          actorRole: user.role,
          action: 'user.locked',
          entity: 'User',
          entityId: user._id,
          details: { reason: '5 failed login attempts', failedAttempts: attempts }
        });

        return res.status(423).json({
          message: 'Your account has been temporarily locked due to too many failed login attempts. Please contact your company administrator to unlock your account.',
          code: 'ACCOUNT_LOCKED',
          lockReason: user.lockReason,
          failedLoginAttempts: attempts
        });
      }

      await user.save();
      return res.status(401).json({ 
        message: 'Invalid credentials',
        remainingAttempts: Math.max(0, 5 - attempts)
      });
    }

    // Password is valid - reset lockout counters
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockReason = null;
    user.lockUntil = null;

    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(user.role).toLowerCase());

    // If logging into a specific tenant workspace, enforce that the user belongs to this tenant!
    if (hostInfo.company && !isSuperAdmin) {
      if (String(user.companyId) !== String(hostInfo.company._id)) {
        return res.status(401).json({ 
          message: 'Invalid credentials for this tenant workspace',
          code: 'TENANT_MISMATCH'
        });
      }
    }

    user.lastLogin = new Date();
    user.lastActivity = new Date();
    await user.save();
    await recordAuditEvent(req, {
      actorId: user._id,
      actorRole: user.role,
      action: 'auth.login',
      entity: 'User',
      entityId: user._id,
      newValue: { lastLogin: user.lastLogin }
    });
    const tokenPayload = {
      id: user._id,
      role: user.role,
      companyId: user.companyId || null,
      customRoleId: user.customRoleId || null,
      scopeType: user.scopeType || 'ALL',
      scopeValues: user.scopeValues || []
    };
    const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    
    let companyDetails = null;
    if (user.companyId) {
      const Company = require('../models/Company');
      const comp = await Company.findById(user.companyId).select('name displayName code subdomain logo branding settings status features billing').lean();
      if (comp) {
        companyDetails = { 
          id: comp._id, 
          name: comp.name, 
          displayName: comp.displayName || comp.name,
          code: comp.code, 
          subdomain: comp.subdomain || null,
          logo: comp.branding?.logo || comp.logo, 
          branding: comp.branding,
          settings: comp.settings,
          status: comp.status,
          plan: comp.billing?.plan || 'STARTER',
          features: comp.features || {}
        };
      }
    }

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        companyId: user.companyId || null,
        company: companyDetails,
        customRoleId: user.customRoleId || null,
        scopeType: user.scopeType || 'ALL',
        scopeValues: user.scopeValues || []
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('companyId', 'name code logo settings').populate('customRoleId');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify token
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('companyId', 'name code logo settings').populate('customRoleId');
    if (!user || !user.isActive) return res.status(401).json({ valid: false, message: 'Invalid token' });
    res.json({ 
      valid: true, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        companyId: user.companyId?._id || user.companyId || null,
        company: user.companyId ? { id: user.companyId._id, name: user.companyId.name, code: user.companyId.code } : null,
        customRoleId: user.customRoleId,
        scopeType: user.scopeType,
        scopeValues: user.scopeValues
      } 
    });
  } catch (err) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

// Get current user (alias for verify)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('companyId', 'name code logo settings').populate('customRoleId');
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid token' });
    res.json({ 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      phone: user.phone, 
      department: user.department,
      companyId: user.companyId?._id || user.companyId || null,
      company: user.companyId ? { id: user.companyId._id, name: user.companyId.name, code: user.companyId.code } : null,
      customRoleId: user.customRoleId,
      scopeType: user.scopeType,
      scopeValues: user.scopeValues
    });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
