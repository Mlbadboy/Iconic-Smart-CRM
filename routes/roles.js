const express = require('express');
const Role = require('../models/Role');
const User = require('../models/User');
const Company = require('../models/Company');
const Department = require('../models/Department');
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { resolveTenant, requireTenant } = require('../middleware/tenant');
const { recordAuditEvent } = require('../services/auditService');
const {
  getGroupedPermissionsForCompany,
  getRoleTemplatesForCompany,
  validatePermissionsAgainstEntitlements,
  canUserDelegatePermissions
} = require('../services/permissionRegistry');
const logger = require('../services/logger');

const router = express.Router();

/**
 * GET /api/roles/available-permissions
 * Returns all permissions categorized by feature with enablement status for current company
 */
router.get('/available-permissions', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const comp = await Company.findById(req.companyId).select('features').lean();
    const companyFeatures = comp?.features || {};
    const grouped = getGroupedPermissionsForCompany(companyFeatures);
    res.json({
      companyId: req.companyId,
      features: companyFeatures,
      permissionGroups: grouped
    });
  } catch (err) {
    logger.error('Error fetching available permissions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/roles/templates
 * Returns built-in role templates filtered to features enabled for this company
 */
router.get('/templates', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const comp = await Company.findById(req.companyId).select('features').lean();
    const companyFeatures = comp?.features || {};
    const templates = getRoleTemplatesForCompany(companyFeatures);
    res.json(templates);
  } catch (err) {
    logger.error('Error fetching role templates:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/roles
 * List custom roles for the active company with assigned user counts
 */
router.get('/', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const roles = await Role.find({ companyId: req.companyId })
      .populate('departmentId', 'name')
      .sort({ name: 1 })
      .lean();

    // Attach count of users currently assigned to each role
    const rolesWithCounts = await Promise.all(roles.map(async (role) => {
      const assignedUsersCount = await User.countDocuments({ customRoleId: role._id, companyId: req.companyId });
      return {
        ...role,
        assignedUsersCount
      };
    }));

    res.json(rolesWithCounts);
  } catch (err) {
    logger.error('Error listing roles:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/roles/:id
 * Get single role details
 */
router.get('/:id', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, companyId: req.companyId })
      .populate('departmentId', 'name description')
      .lean();

    if (!role) return res.status(404).json({ error: 'Role not found' });

    const assignedUsersCount = await User.countDocuments({ customRoleId: role._id, companyId: req.companyId });
    res.json({ ...role, assignedUsersCount });
  } catch (err) {
    logger.error('Error getting role:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/roles
 * Create new dynamic role constrained by company feature entitlements
 */
router.post('/', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'role.manage')) {
      return res.status(403).json({ error: 'Permission denied: role.manage required to create roles' });
    }

    const { name, description, departmentId, department, permissions, scopeType, scopeValues } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });

    const comp = await Company.findById(req.companyId).select('features').lean();
    const companyFeatures = comp?.features || {};

    const reqPermissions = Array.isArray(permissions) ? permissions : [];

    // 1. Validate permissions against company enabled features
    const featureCheck = validatePermissionsAgainstEntitlements(reqPermissions, companyFeatures);
    if (!featureCheck.isValid) {
      return res.status(400).json({
        error: `Cannot assign permissions for disabled company features: ${featureCheck.invalidPermissions.map(p => p.permission).join(', ')}`,
        code: 'FEATURE_NOT_ENABLED_FOR_COMPANY',
        invalidPermissions: featureCheck.invalidPermissions
      });
    }

    // 2. Validate delegation security (cannot delegate what actor lacks)
    const delegationCheck = canUserDelegatePermissions(req.user, reqPermissions, companyFeatures);
    if (!delegationCheck.isValid) {
      return res.status(403).json({
        error: 'Privilege escalation blocked: You cannot delegate permissions you do not possess',
        code: 'UNAUTHORIZED_PERMISSION_DELEGATION'
      });
    }

    // 3. Unique role name within company
    const existing = await Role.findOne({ companyId: req.companyId, name: name.trim() });
    if (existing) return res.status(409).json({ error: `Role '${name}' already exists in this company` });

    // 4. Resolve Department
    let deptName = department;
    if (departmentId) {
      const deptDoc = await Department.findOne({ _id: departmentId, companyId: req.companyId });
      if (deptDoc) deptName = deptDoc.name;
    }

    const role = new Role({
      companyId: req.companyId,
      name: name.trim(),
      description: description ? description.trim() : undefined,
      departmentId: departmentId || undefined,
      department: deptName ? deptName.trim() : undefined,
      permissions: reqPermissions,
      scopeType: scopeType || 'ALL',
      scopeValues: Array.isArray(scopeValues) ? scopeValues : [],
      isActive: true
    });

    await role.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'role.create',
      entity: 'Role',
      entityId: role._id,
      newValue: { name: role.name, permissions: role.permissions, scopeType: role.scopeType }
    });

    res.status(201).json({ message: 'Role created successfully', role });
  } catch (err) {
    logger.error('Error creating role:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/roles/:id
 * Update dynamic role
 */
router.put('/:id', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'role.manage')) {
      return res.status(403).json({ error: 'Permission denied to edit roles' });
    }

    const role = await Role.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ error: 'System roles cannot be modified' });

    const { name, description, departmentId, department, permissions, scopeType, scopeValues, isActive } = req.body;

    const comp = await Company.findById(req.companyId).select('features').lean();
    const companyFeatures = comp?.features || {};

    if (Array.isArray(permissions)) {
      const featureCheck = validatePermissionsAgainstEntitlements(permissions, companyFeatures);
      if (!featureCheck.isValid) {
        return res.status(400).json({
          error: `Cannot assign permissions for disabled company features: ${featureCheck.invalidPermissions.map(p => p.permission).join(', ')}`,
          code: 'FEATURE_NOT_ENABLED_FOR_COMPANY',
          invalidPermissions: featureCheck.invalidPermissions
        });
      }

      const delegationCheck = canUserDelegatePermissions(req.user, permissions, companyFeatures);
      if (!delegationCheck.isValid) {
        return res.status(403).json({
          error: 'Privilege escalation blocked: You cannot delegate permissions you do not possess',
          code: 'UNAUTHORIZED_PERMISSION_DELEGATION'
        });
      }
      role.permissions = permissions;
    }

    if (name) role.name = name.trim();
    if (description !== undefined) role.description = description ? description.trim() : '';
    if (departmentId !== undefined) {
      if (departmentId) {
        const deptDoc = await Department.findOne({ _id: departmentId, companyId: req.companyId });
        if (deptDoc) {
          role.departmentId = deptDoc._id;
          role.department = deptDoc.name;
        }
      } else {
        role.departmentId = undefined;
      }
    }
    if (department !== undefined) role.department = department ? department.trim() : '';
    if (scopeType) role.scopeType = scopeType;
    if (Array.isArray(scopeValues)) role.scopeValues = scopeValues;
    if (isActive !== undefined) role.isActive = Boolean(isActive);

    role.updatedAt = new Date();
    await role.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'role.update',
      entity: 'Role',
      entityId: role._id,
      newValue: { name: role.name, permissions: role.permissions, scopeType: role.scopeType }
    });

    res.json({ message: 'Role updated successfully', role });
  } catch (err) {
    logger.error('Error updating role:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/roles/:id/duplicate
 * Duplicate an existing custom role
 */
router.post('/:id/duplicate', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'role.manage')) {
      return res.status(403).json({ error: 'Permission denied to duplicate roles' });
    }

    const sourceRole = await Role.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!sourceRole) return res.status(404).json({ error: 'Source role not found' });

    let duplicateName = `${sourceRole.name} (Copy)`;
    let counter = 1;
    while (await Role.findOne({ companyId: req.companyId, name: duplicateName })) {
      counter++;
      duplicateName = `${sourceRole.name} (Copy ${counter})`;
    }

    const duplicate = new Role({
      companyId: req.companyId,
      name: duplicateName,
      description: sourceRole.description ? `Copy of ${sourceRole.name}` : undefined,
      departmentId: sourceRole.departmentId,
      department: sourceRole.department,
      permissions: sourceRole.permissions,
      scopeType: sourceRole.scopeType,
      scopeValues: sourceRole.scopeValues,
      isActive: true,
      isSystem: false
    });

    await duplicate.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'role.duplicate',
      entity: 'Role',
      entityId: duplicate._id,
      details: { sourceRoleId: sourceRole._id, sourceRoleName: sourceRole.name }
    });

    res.status(201).json({ message: 'Role duplicated successfully', role: duplicate });
  } catch (err) {
    logger.error('Error duplicating role:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/roles/:id
 * Delete dynamic role (strictly guarded against assigned active users)
 */
router.delete('/:id', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'role.manage')) {
      return res.status(403).json({ error: 'Permission denied to delete roles' });
    }

    const role = await Role.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ error: 'System roles cannot be deleted' });

    // Check if any active user is currently assigned to this role
    const assignedUsers = await User.countDocuments({ customRoleId: role._id, companyId: req.companyId });
    if (assignedUsers > 0) {
      return res.status(400).json({
        error: `Cannot delete role '${role.name}': ${assignedUsers} user(s) are currently assigned to it. Please reassign them before deleting.`,
        code: 'ROLE_HAS_ASSIGNED_USERS',
        assignedUsersCount: assignedUsers
      });
    }

    await Role.findByIdAndDelete(role._id);

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'role.delete',
      entity: 'Role',
      entityId: role._id,
      oldValue: { name: role.name }
    });

    res.json({ message: `Role '${role.name}' deleted successfully` });
  } catch (err) {
    logger.error('Error deleting role:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
