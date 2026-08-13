const permissionAliases = {
  'users.view': 'user.view',
  'users.create': 'user.create',
  'users.edit': 'user.edit',
  'users.delete': 'user.disable',
  'orders.view': 'order.view',
  'orders.create': 'order.create',
  'orders.edit': 'order.edit',
  'reports.view': 'report.view',
  'reports.export': 'report.export',
  'sales.view': 'lead.view',
  'sales.create': 'lead.create',
  'sales.edit': 'lead.edit',
  'sales.assign': 'lead.assign'
};

const rolePermissions = {
  admin: ['*'],
  administrator: ['*'],
  auditor: ['audit.view', 'report.view', 'customer.view', 'lead.view', 'opportunity.view', 'service.view', 'finance.view', 'marketing.view', 'operations.view', 'warranty.view'],
  manager: ['customer.view', 'customer.edit', 'lead.view', 'lead.edit', 'opportunity.view', 'opportunity.edit', 'service.view', 'service.assign', 'service.escalate', 'report.view', 'report.export', 'order.view', 'order.edit'],
  'crm-manager': ['customer.view', 'customer.edit', 'lead.view', 'lead.edit', 'opportunity.view', 'opportunity.edit', 'service.view', 'service.assign', 'service.escalate', 'finance.view', 'marketing.view', 'operations.view', 'warranty.view', 'report.view', 'report.export', 'user.view'],
  'crm-executive': ['customer.view', 'service.view', 'service.create', 'order.view', 'lead.view'],
  sales: ['customer.view', 'lead.view', 'lead.create', 'lead.edit', 'opportunity.view', 'opportunity.create', 'opportunity.edit', 'order.view', 'order.create'],
  'sales-manager': ['customer.view', 'lead.view', 'lead.create', 'lead.edit', 'lead.assign', 'opportunity.view', 'opportunity.create', 'opportunity.edit', 'opportunity.assign', 'order.view', 'order.create', 'order.edit', 'report.view'],
  'sales-executive': ['customer.view', 'lead.view', 'lead.create', 'lead.edit', 'opportunity.view', 'opportunity.create', 'opportunity.edit', 'order.view', 'order.create'],
  'field-executive': ['customer.view', 'service.view', 'service.create', 'order.view', 'order.create'],
  'service-manager': ['customer.view', 'service.view', 'service.create', 'service.edit', 'service.assign', 'service.escalate', 'service.resolve', 'service.close', 'report.view'],
  'service-agent': ['customer.view', 'service.view', 'service.create', 'service.edit', 'service.resolve', 'service.close'],
  'finance-manager': ['customer.view', 'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.refund', 'order.view', 'report.view', 'report.export'],
  'finance-executive': ['customer.view', 'finance.view', 'finance.create', 'finance.edit', 'order.view'],
  'marketing-manager': ['customer.view', 'marketing.view', 'marketing.create', 'marketing.edit', 'marketing.launch', 'report.view'],
  'marketing-executive': ['customer.view', 'marketing.view', 'marketing.create', 'marketing.edit'],
  'operations-manager': ['customer.view', 'operations.view', 'operations.edit', 'operations.assign', 'order.view', 'order.edit', 'service.view'],
  'support-agent': ['customer.view', 'service.view', 'service.create', 'service.edit'],
  user: ['order.view', 'order.create', 'service.view', 'service.create'],
  member: ['order.view', 'order.create', 'service.view', 'service.create']
};

function normalizePermission(permission) {
  return permissionAliases[permission] || permission;
}

function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  const permissions = rolePermissions[user.role] || [];
  const normalized = normalizePermission(permission);
  return permissions.includes('*') || permissions.map(normalizePermission).includes(normalized);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ message: `Permission required: ${normalizePermission(permission)}` });
    }
    next();
  };
}

module.exports = { hasPermission, normalizePermission, requirePermission, rolePermissions };
