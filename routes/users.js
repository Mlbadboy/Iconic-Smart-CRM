const express = require('express');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');
const { hasPermission, requirePermission } = require('../middleware/rbac');
const { resolveTenant, requireTenant } = require('../middleware/tenant');
const { recordAuditEvent } = require('../services/auditService');
const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const logger = require('../services/logger');

const router = express.Router();

const normalizeEmail = (email = '') => email.trim().toLowerCase();

/**
 * GET /api/users/stats/overview
 * Organization Overview Metrics for Dashboard & Admin Widget
 */
router.get('/stats/overview', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(req.user.role).toLowerCase());
    const companyFilter = (isSuperAdmin && !req.companyId) ? {} : { companyId: req.companyId };

    const [totalUsers, activeUsers, lockedUsers, disabledUsers, rolesCount, departmentsCount, allUsers] = await Promise.all([
      User.countDocuments(companyFilter),
      User.countDocuments({ ...companyFilter, $or: [{ status: 'ACTIVE' }, { isActive: true, status: { $ne: 'DISABLED' }, isLocked: false }] }),
      User.countDocuments({ ...companyFilter, $or: [{ isLocked: true }, { status: 'LOCKED' }] }),
      User.countDocuments({ ...companyFilter, $or: [{ status: 'DISABLED' }, { isActive: false }] }),
      Role.countDocuments(companyFilter),
      Department.countDocuments(companyFilter),
      User.find(companyFilter).select('department role status isLocked isActive').lean()
    ]);

    // Calculate department distribution
    const departmentDistribution = {};
    for (const u of allUsers) {
      const deptName = u.department || 'General';
      departmentDistribution[deptName] = (departmentDistribution[deptName] || 0) + 1;
    }

    res.json({
      totalUsers,
      activeUsers,
      lockedUsers,
      disabledUsers,
      rolesCount,
      departmentsCount,
      departmentDistribution
    });
  } catch (error) {
    logger.error('Error fetching user stats overview:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/users
 * List all users in company with search & filtering
 */
router.get('/', auth, resolveTenant, requireTenant, requirePermission('user.view'), async (req, res) => {
  try {
    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(req.user.role).toLowerCase());
    const filter = (isSuperAdmin && !req.companyId) ? {} : { companyId: req.companyId };

    const { search, department, role, status } = req.query;

    if (department) {
      filter.department = department;
    }
    if (role) {
      filter.role = role;
    }
    if (status) {
      if (status === 'LOCKED') {
        filter.$or = [{ isLocked: true }, { status: 'LOCKED' }];
      } else if (status === 'DISABLED') {
        filter.$or = [{ status: 'DISABLED' }, { isActive: false }];
      } else if (status === 'ACTIVE') {
        filter.status = 'ACTIVE';
        filter.isActive = true;
        filter.isLocked = false;
      }
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { department: searchRegex }
        ]
      });
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('customRoleId', 'name permissions scopeType')
      .populate('departmentId', 'name')
      .populate('reportingManagerId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    res.json(users);
  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get('/:id', auth, resolveTenant, requireTenant, requirePermission('user.view'), async (req, res) => {
  try {
    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(req.user.role).toLowerCase());
    const query = { _id: req.params.id };
    if (!isSuperAdmin || req.companyId) {
      query.companyId = req.companyId;
    }

    const user = await User.findOne(query)
      .select('-password')
      .populate('customRoleId', 'name permissions scopeType scopeValues')
      .populate('departmentId', 'name description')
      .populate('reportingManagerId', 'name email role')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/users
 * Create new user inside active tenant
 */
router.post('/', auth, resolveTenant, requireTenant, requirePermission('user.create'), async (req, res) => {
  try {
    const { name, phone, password, role, customRoleId, departmentId, department, reportingManagerId, scopeType, scopeValues, status } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check email uniqueness
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // If custom role is assigned, verify it belongs to this company
    let resolvedRole = role || 'user';
    let customRoleDoc = null;
    if (customRoleId) {
      customRoleDoc = await Role.findOne({ _id: customRoleId, companyId: req.companyId });
      if (!customRoleDoc) {
        return res.status(400).json({ message: 'Invalid custom role selected for this company' });
      }
      if (customRoleDoc.isActive === false) {
        return res.status(400).json({ message: 'Cannot assign a disabled role to a user' });
      }
    }

    // If departmentId is provided, verify it belongs to this company
    let deptName = department;
    if (departmentId) {
      const deptDoc = await Department.findOne({ _id: departmentId, companyId: req.companyId });
      if (deptDoc) {
        deptName = deptDoc.name;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email,
      password: hashedPassword,
      phone: phone ? phone.trim() : undefined,
      role: resolvedRole,
      companyId: req.companyId,
      customRoleId: customRoleId || undefined,
      departmentId: departmentId || undefined,
      department: deptName ? deptName.trim() : undefined,
      reportingManagerId: reportingManagerId || undefined,
      scopeType: scopeType || customRoleDoc?.scopeType || 'ALL',
      scopeValues: Array.isArray(scopeValues) ? scopeValues : (customRoleDoc?.scopeValues || []),
      status: status || 'ACTIVE',
      isActive: status !== 'DISABLED',
      isLocked: status === 'LOCKED',
      failedLoginAttempts: 0
    });

    await user.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'user.create',
      entity: 'User',
      entityId: user._id,
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        scopeType: user.scopeType
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        scopeType: user.scopeType
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user metadata, role, department, data scope, or status
 */
router.put('/:id', auth, resolveTenant, requireTenant, requirePermission('user.edit'), async (req, res) => {
  try {
    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(req.user.role).toLowerCase());
    const query = { _id: req.params.id };
    if (!isSuperAdmin || req.companyId) {
      query.companyId = req.companyId;
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: 'User not found in this workspace' });
    }

    const { name, phone, role, customRoleId, departmentId, department, reportingManagerId, scopeType, scopeValues, status, isActive } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : '';
    if (role) user.role = role;
    if (department !== undefined) user.department = department ? department.trim() : '';

    if (customRoleId !== undefined) {
      if (customRoleId) {
        const customRoleDoc = await Role.findOne({ _id: customRoleId, companyId: req.companyId });
        if (!customRoleDoc) {
          return res.status(400).json({ message: 'Invalid custom role selected for this company' });
        }
        if (customRoleDoc.isActive === false) {
          return res.status(400).json({ message: 'Cannot assign a disabled role' });
        }
        user.customRoleId = customRoleId;
      } else {
        user.customRoleId = undefined;
      }
    }

    if (departmentId !== undefined) {
      if (departmentId) {
        const deptDoc = await Department.findOne({ _id: departmentId, companyId: req.companyId });
        if (deptDoc) {
          user.departmentId = deptDoc._id;
          user.department = deptDoc.name;
        }
      } else {
        user.departmentId = undefined;
      }
    }

    if (reportingManagerId !== undefined) {
      user.reportingManagerId = reportingManagerId || undefined;
    }

    if (scopeType) user.scopeType = scopeType;
    if (Array.isArray(scopeValues)) user.scopeValues = scopeValues;

    if (status) {
      user.status = status;
      if (status === 'DISABLED') {
        user.isActive = false;
      } else if (status === 'ACTIVE') {
        user.isActive = true;
        user.isLocked = false;
        user.failedLoginAttempts = 0;
        user.lockReason = null;
      } else if (status === 'LOCKED') {
        user.isLocked = true;
      }
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
      if (!user.isActive) {
        user.status = 'DISABLED';
      }
    }

    user.updatedAt = new Date();
    await user.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'user.update',
      entity: 'User',
      entityId: user._id,
      newValue: {
        name: user.name,
        role: user.role,
        department: user.department,
        status: user.status,
        scopeType: user.scopeType
      }
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/users/:id/unlock
 * Unlock locked account (Company Admin for own tenant, Super Admin for platform support)
 */
router.post('/:id/unlock', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(req.user.role).toLowerCase());
    const isCompanyAdmin = hasPermission(req.user, 'user.unlock') || hasPermission(req.user, 'role.manage') || ['company-admin', 'sub-admin', 'admin'].includes(String(req.user.role).toLowerCase());

    if (!isSuperAdmin && !isCompanyAdmin) {
      return res.status(403).json({ message: 'Permission required: user.unlock' });
    }

    const query = { _id: req.params.id };
    if (!isSuperAdmin || req.companyId) {
      query.companyId = req.companyId;
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: 'User not found in this workspace' });
    }

    user.isLocked = false;
    user.status = 'ACTIVE';
    user.isActive = true;
    user.failedLoginAttempts = 0;
    user.lockReason = null;
    user.lockUntil = null;
    user.updatedAt = new Date();
    await user.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'user.unlocked',
      entity: 'User',
      entityId: user._id,
      details: { unlockedBy: req.user.email, role: req.user.role }
    });

    res.json({ message: `Account for ${user.name} (${user.email}) has been successfully unlocked.` });
  } catch (error) {
    logger.error('Error unlocking user account:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset password for a tenant user
 */
router.post('/:id/reset-password', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(req.user.role).toLowerCase());
    const isCompanyAdmin = hasPermission(req.user, 'user.reset_password') || hasPermission(req.user, 'role.manage') || ['company-admin', 'sub-admin', 'admin'].includes(String(req.user.role).toLowerCase());

    if (!isSuperAdmin && !isCompanyAdmin) {
      return res.status(403).json({ message: 'Permission required: user.reset_password' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const query = { _id: req.params.id };
    if (!isSuperAdmin || req.companyId) {
      query.companyId = req.companyId;
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: 'User not found in this workspace' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isLocked = false;
    user.status = user.status === 'LOCKED' ? 'ACTIVE' : user.status;
    user.failedLoginAttempts = 0;
    user.lockReason = null;
    user.lockUntil = null;
    user.updatedAt = new Date();
    await user.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'user.password_reset',
      entity: 'User',
      entityId: user._id,
      details: { resetBy: req.user.email }
    });

    res.json({ message: `Password for ${user.name} has been successfully reset.` });
  } catch (error) {
    logger.error('Error resetting user password:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Soft deactivation by default (Preserves history & ownership)
 */
router.delete('/:id', auth, resolveTenant, requireTenant, requirePermission('user.disable'), async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate or delete your own account' });
    }

    const isSuperAdmin = ['super-admin', 'superadmin'].includes(String(req.user.role).toLowerCase());
    const query = { _id: userId };
    if (!isSuperAdmin || req.companyId) {
      query.companyId = req.companyId;
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: 'User not found in this workspace' });
    }

    const isPermanent = req.query.permanent === 'true' && isSuperAdmin;

    if (isPermanent) {
      await User.findByIdAndDelete(userId);
      await recordAuditEvent(req, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'user.delete_permanent',
        entity: 'User',
        entityId: user._id,
        previousValue: { name: user.name, email: user.email, role: user.role }
      });
      return res.json({ message: 'User permanently deleted', deletedUser: user.name });
    }

    // Soft-deactivation by default
    user.isActive = false;
    user.status = 'DISABLED';
    user.updatedAt = new Date();
    await user.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'user.deactivate',
      entity: 'User',
      entityId: user._id,
      newValue: { status: 'DISABLED', isActive: false }
    });

    res.json({ message: `User ${user.name} has been deactivated.`, user });
  } catch (error) {
    logger.error('Error disabling user:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
