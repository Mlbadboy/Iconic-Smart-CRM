const Role = require('../models/Role');
const logger = require('../services/logger');

const permissionAliases = {
  'users.view': 'user.view',
  'users.create': 'user.create',
  'users.edit': 'user.edit',
  'users.delete': 'user.disable',
  'users.disable': 'user.disable',
  'users.unlock': 'user.unlock',
  'users.reset_password': 'user.reset_password',
  'roles.view': 'role.view',
  'roles.manage': 'role.manage',
  'departments.view': 'department.view',
  'departments.manage': 'department.manage',
  'orders.view': 'order.view',
  'orders.create': 'order.create',
  'orders.edit': 'order.edit',
  'orders.approve': 'order.approve',
  'reports.view': 'report.view',
  'reports.export': 'report.export',
  'sales.view': 'lead.view',
  'sales.create': 'lead.create',
  'sales.edit': 'lead.edit',
  'sales.assign': 'lead.assign',
  'inventory.view': 'inventory.view',
  'inventory.transfer': 'inventory.transfer',
  'inventory.adjust': 'inventory.adjust'
};

const rolePermissions = {
  'super-admin': ['*'],
  'superadmin': ['*'],
  'company-admin': ['*'],
  'sub-admin': ['*'],
  admin: ['*'],
  administrator: ['*'],
  auditor: ['audit.view', 'report.view', 'customer.view', 'lead.view', 'opportunity.view', 'service.view', 'finance.view', 'marketing.view', 'operations.view', 'warranty.view', 'serial_validation.view', 'serial_validation.history'],
  manager: ['customer.view', 'customer.edit', 'lead.view', 'lead.edit', 'opportunity.view', 'opportunity.edit', 'service.view', 'service.assign', 'service.escalate', 'report.view', 'report.export', 'order.view', 'order.edit', 'serial_validation.view', 'serial_validation.validate', 'serial_validation.history', 'inventory.view', 'inventory.transfer', 'user.view', 'department.view'],
  'crm-manager': ['customer.view', 'customer.edit', 'lead.view', 'lead.edit', 'opportunity.view', 'opportunity.edit', 'service.view', 'service.assign', 'service.escalate', 'finance.view', 'marketing.view', 'operations.view', 'warranty.view', 'report.view', 'report.export', 'user.view', 'serial_validation.view', 'serial_validation.validate', 'serial_validation.history', 'department.view'],
  'crm-executive': ['customer.view', 'service.view', 'service.create', 'order.view', 'lead.view', 'serial_validation.view', 'serial_validation.validate'],
  sales: ['customer.view', 'lead.view', 'lead.create', 'lead.edit', 'opportunity.view', 'opportunity.create', 'opportunity.edit', 'order.view', 'order.create', 'serial_validation.view', 'serial_validation.validate', 'inventory.view'],
  'sales-manager': ['customer.view', 'lead.view', 'lead.create', 'lead.edit', 'lead.assign', 'opportunity.view', 'opportunity.create', 'opportunity.edit', 'opportunity.assign', 'order.view', 'order.create', 'order.edit', 'report.view', 'serial_validation.view', 'serial_validation.validate', 'serial_validation.history', 'inventory.view', 'inventory.transfer', 'user.view'],
  'sales-executive': ['customer.view', 'lead.view', 'lead.create', 'lead.edit', 'opportunity.view', 'opportunity.create', 'opportunity.edit', 'order.view', 'order.create', 'serial_validation.view', 'serial_validation.validate', 'inventory.view'],
  'distributor-manager': ['customer.view', 'order.view', 'order.create', 'inventory.view', 'inventory.transfer', 'report.view'],
  'dealer-manager': ['customer.view', 'order.view', 'order.create', 'inventory.view', 'inventory.transfer'],
  'field-executive': ['customer.view', 'service.view', 'service.create', 'order.view', 'order.create', 'serial_validation.view', 'serial_validation.validate'],
  'service-manager': ['customer.view', 'service.view', 'service.create', 'service.edit', 'service.assign', 'service.escalate', 'service.resolve', 'service.close', 'report.view', 'serial_validation.view', 'serial_validation.validate', 'serial_validation.history', 'user.view'],
  'service-agent': ['customer.view', 'service.view', 'service.create', 'service.edit', 'service.resolve', 'service.close', 'serial_validation.view', 'serial_validation.validate'],
  'finance-manager': ['customer.view', 'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.refund', 'order.view', 'report.view', 'report.export', 'serial_validation.view', 'serial_validation.validate', 'serial_validation.history', 'user.view'],
  'finance-executive': ['customer.view', 'finance.view', 'finance.create', 'finance.edit', 'order.view'],
  'marketing-manager': ['customer.view', 'marketing.view', 'marketing.contacts.view', 'marketing.contacts.import', 'marketing.templates.view', 'marketing.templates.manage', 'marketing.campaign.view', 'marketing.campaign.create', 'marketing.campaign.edit', 'marketing.campaign.approve', 'marketing.campaign.send', 'marketing.campaign.schedule', 'marketing.campaign.pause', 'marketing.analytics.view', 'marketing.whatsapp.manage', 'report.view', 'user.view'],
  'marketing-executive': ['customer.view', 'marketing.view', 'marketing.contacts.view', 'marketing.contacts.import', 'marketing.templates.view', 'marketing.campaign.view', 'marketing.campaign.create', 'marketing.campaign.edit'],
  'operations-manager': ['customer.view', 'operations.view', 'operations.edit', 'operations.assign', 'order.view', 'order.edit', 'service.view', 'serial_validation.view', 'serial_validation.validate', 'serial_validation.history', 'inventory.view', 'inventory.transfer', 'inventory.adjust', 'user.view', 'bulk_import.view', 'bulk_import.create', 'bulk_import.validate', 'bulk_import.execute', 'bulk_import.history'],
  'support-agent': ['customer.view', 'service.view', 'service.create', 'service.edit', 'serial_validation.view', 'serial_validation.validate'],
  user: ['order.view', 'order.create', 'service.view', 'service.create', 'inventory.view'],
  member: ['order.view', 'order.create', 'service.view', 'service.create']
};

function normalizePermission(permission) {
  return permissionAliases[permission] || permission;
}

/**
 * Check if a user has a specific permission (synchronous check for token/static roles)
 */
function hasPermission(user, permission) {
  if (!user) return false;
  const roleStr = user.role ? String(user.role).toLowerCase() : '';
  
  // Super Admin & Company Admin have wildcard inside their tenant
  if (roleStr === 'super-admin' || roleStr === 'superadmin' || roleStr === 'company-admin' || roleStr === 'sub-admin' || roleStr === 'admin') {
    return true;
  }

  const normalized = normalizePermission(permission);

  // Check explicit permissions attached to user token or dynamic role
  if (Array.isArray(user.permissions)) {
    if (user.permissions.includes('*') || user.permissions.map(normalizePermission).includes(normalized)) {
      return true;
    }
    // If user has a custom role assigned, their custom role permissions are authoritative
    if (user.customRoleId) {
      return false;
    }
  }

  // If user has customRoleId, they must not fall back to generic static roles
  if (user.customRoleId) {
    return false;
  }

  // Check static predefined role permissions
  const permissions = rolePermissions[roleStr] || [];
  return permissions.includes('*') || permissions.map(normalizePermission).includes(normalized);
}

/**
 * Express middleware to enforce required permission
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check dynamic custom role in DB if present on user
    if (req.user.customRoleId && (!req.user.permissions || !req.user.permissions.length)) {
      try {
        const dynamicRole = await Role.findById(req.user.customRoleId).lean();
        if (dynamicRole && dynamicRole.isActive !== false) {
          req.user.permissions = dynamicRole.permissions || [];
          req.user.scopeType = dynamicRole.scopeType || req.user.scopeType;
          req.user.scopeValues = dynamicRole.scopeValues || req.user.scopeValues;
        }
      } catch (err) {
        logger.warn('Error loading custom dynamic role:', err.message);
      }
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ message: `Permission required: ${normalizePermission(permission)}` });
    }
    next();
  };
}

/**
 * Apply Data Scope filtering to a Mongoose query
 */
function applyDataScope(req, baseFilter = {}) {
  const filter = { ...baseFilter };
  const user = req.user;
  if (!user) return filter;

  const roleStr = String(user.role || '').toLowerCase();
  if (roleStr === 'super-admin' || roleStr === 'superadmin' || roleStr === 'company-admin' || roleStr === 'admin') {
    return filter; // Unrestricted within tenant
  }

  const scopeType = (user.scopeType || 'ALL').toUpperCase();
  const scopeValues = Array.isArray(user.scopeValues) ? user.scopeValues : [];

  if (scopeType === 'REGION' && scopeValues.length > 0) {
    filter.region = { $in: scopeValues };
  } else if (scopeType === 'TERRITORY' && scopeValues.length > 0) {
    filter.territory = { $in: scopeValues };
  } else if (scopeType === 'DISTRIBUTOR' && scopeValues.length > 0) {
    filter.distributorCode = { $in: scopeValues };
  } else if ((scopeType === 'DEALER' || scopeType === 'DEALER_NETWORK') && scopeValues.length > 0) {
    filter.dealerCode = { $in: scopeValues };
  } else if (scopeType === 'RETAILER' && scopeValues.length > 0) {
    filter.retailerCode = { $in: scopeValues };
  } else if (scopeType === 'SELF' || scopeType === 'OWN') {
    filter.$or = [
      { createdBy: user.id },
      { userId: user.id },
      { assignedTo: user.id },
      { employeeId: user.id }
    ];
  }

  return filter;
}

module.exports = {
  hasPermission,
  normalizePermission,
  requirePermission,
  rolePermissions,
  applyDataScope
};
