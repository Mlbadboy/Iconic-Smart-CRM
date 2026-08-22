const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');
const Role = require('../models/Role');
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { resolveTenant, requireTenant } = require('../middleware/tenant');
const { recordAuditEvent } = require('../services/auditService');
const logger = require('../services/logger');

const router = express.Router();

/**
 * GET /api/departments
 * List departments for the active company with member counts
 */
router.get('/', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const departments = await Department.find({ companyId: req.companyId })
      .populate('headOfDepartment', 'name email role')
      .sort({ name: 1 })
      .lean();

    const deptsWithMetrics = await Promise.all(departments.map(async (dept) => {
      const memberCount = await User.countDocuments({
        companyId: req.companyId,
        $or: [{ departmentId: dept._id }, { department: dept.name }]
      });
      const rolesCount = await Role.countDocuments({
        companyId: req.companyId,
        $or: [{ departmentId: dept._id }, { department: dept.name }]
      });
      return {
        ...dept,
        memberCount,
        rolesCount
      };
    }));

    res.json(deptsWithMetrics);
  } catch (err) {
    logger.error('Error listing departments:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/departments
 * Create a new department
 */
router.post('/', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'department.manage') && !hasPermission(req.user, 'role.manage')) {
      return res.status(403).json({ error: 'Permission denied: department.manage required' });
    }

    const { name, description, headOfDepartment } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const existing = await Department.findOne({ companyId: req.companyId, name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: `Department '${name}' already exists in this company` });
    }

    const dept = new Department({
      companyId: req.companyId,
      name: name.trim(),
      description: description ? description.trim() : undefined,
      headOfDepartment: headOfDepartment || undefined,
      isActive: true
    });

    await dept.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'department.create',
      entity: 'Department',
      entityId: dept._id,
      newValue: { name: dept.name, description: dept.description }
    });

    res.status(201).json({ message: 'Department created successfully', department: dept });
  } catch (err) {
    logger.error('Error creating department:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/departments/:id
 * Update department details
 */
router.put('/:id', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'department.manage') && !hasPermission(req.user, 'role.manage')) {
      return res.status(403).json({ error: 'Permission denied: department.manage required' });
    }

    const dept = await Department.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const { name, description, headOfDepartment, isActive } = req.body;
    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description ? description.trim() : '';
    if (headOfDepartment !== undefined) dept.headOfDepartment = headOfDepartment || undefined;
    if (isActive !== undefined) dept.isActive = Boolean(isActive);

    dept.updatedAt = new Date();
    await dept.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'department.update',
      entity: 'Department',
      entityId: dept._id,
      newValue: { name: dept.name, description: dept.description }
    });

    res.json({ message: 'Department updated successfully', department: dept });
  } catch (err) {
    logger.error('Error updating department:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/departments/:id
 * Delete department
 */
router.delete('/:id', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'department.manage') && !hasPermission(req.user, 'role.manage')) {
      return res.status(403).json({ error: 'Permission denied: department.manage required' });
    }

    const dept = await Department.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const assignedUsers = await User.countDocuments({
      companyId: req.companyId,
      $or: [{ departmentId: dept._id }, { department: dept.name }]
    });

    if (assignedUsers > 0) {
      return res.status(400).json({
        error: `Cannot delete department '${dept.name}': ${assignedUsers} user(s) are assigned to it. Please reassign them first.`,
        code: 'DEPARTMENT_HAS_MEMBERS'
      });
    }

    await Department.findByIdAndDelete(dept._id);

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'department.delete',
      entity: 'Department',
      entityId: dept._id,
      oldValue: { name: dept.name }
    });

    res.json({ message: `Department '${dept.name}' deleted successfully` });
  } catch (err) {
    logger.error('Error deleting department:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
