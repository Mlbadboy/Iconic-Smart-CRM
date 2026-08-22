/**
 * Charlie's CRM — Authoritative Permission Registry & Feature Constraint Engine
 */

// 18 CRM Features and their constituent granular permissions
const FEATURE_PERMISSION_MAP = {
  dashboard: {
    name: 'Executive Dashboard',
    category: 'Core',
    permissions: [
      { key: 'dashboard.view', label: 'View Dashboard & KPIs' }
    ]
  },
  sales: {
    name: 'Sales & Leads',
    category: 'Sales',
    permissions: [
      { key: 'lead.view', label: 'View Leads' },
      { key: 'lead.create', label: 'Create Leads' },
      { key: 'lead.edit', label: 'Edit Leads' },
      { key: 'lead.convert', label: 'Convert Leads' },
      { key: 'lead.assign', label: 'Assign Leads' },
      { key: 'lead.delete', label: 'Delete Leads' },
      { key: 'opportunity.view', label: 'View Opportunities' },
      { key: 'opportunity.create', label: 'Create Opportunities' },
      { key: 'opportunity.edit', label: 'Edit Opportunities' },
      { key: 'opportunity.assign', label: 'Assign Opportunities' }
    ]
  },
  customers: {
    name: 'Customer 360',
    category: 'Core',
    permissions: [
      { key: 'customer.view', label: 'View Customers' },
      { key: 'customer.create', label: 'Create Customers' },
      { key: 'customer.edit', label: 'Edit Customer Profiles' },
      { key: 'customer.delete', label: 'Delete Customers' }
    ]
  },
  orders: {
    name: 'Orders & GST Invoices',
    category: 'Sales',
    permissions: [
      { key: 'order.view', label: 'View Orders & Invoices' },
      { key: 'order.create', label: 'Create Orders' },
      { key: 'order.edit', label: 'Edit Orders' },
      { key: 'order.approve', label: 'Approve Orders' },
      { key: 'order.cancel', label: 'Cancel Orders' }
    ]
  },
  products: {
    name: 'Products Catalog',
    category: 'Inventory',
    permissions: [
      { key: 'product.view', label: 'View Product Catalog' },
      { key: 'product.create', label: 'Add Products' },
      { key: 'product.edit', label: 'Edit Products' },
      { key: 'product.delete', label: 'Delete Products' }
    ]
  },
  inventory: {
    name: 'Unit Inventory Registry',
    category: 'Inventory',
    permissions: [
      { key: 'inventory.view', label: 'View Stock & Units' },
      { key: 'inventory.adjust', label: 'Adjust Stock Levels' },
      { key: 'inventory.transfer', label: 'Transfer Stock Units' }
    ]
  },
  distribution: {
    name: 'Stock Transfers & Distribution',
    category: 'Distribution',
    permissions: [
      { key: 'distribution.view', label: 'View Stock Movements' },
      { key: 'stock_transfer.create', label: 'Dispatch Stock Transfers' },
      { key: 'stock_transfer.accept', label: 'Accept Inbound Transfers' },
      { key: 'stock_transfer.cancel', label: 'Cancel Stock Transfers' }
    ]
  },
  serial_validation: {
    name: 'Serial Number Validation',
    category: 'Verification',
    permissions: [
      { key: 'serial_validation.view', label: 'View Serial Validation' },
      { key: 'serial_validation.validate', label: 'Validate Serial Numbers' },
      { key: 'serial_validation.history', label: 'View Validation History' },
      { key: 'serial_validation.import', label: 'Bulk Import Serial Numbers' }
    ]
  },
  qr_verification: {
    name: 'QR / Product Verification',
    category: 'Verification',
    permissions: [
      { key: 'product.verify', label: 'Verify QR Codes' },
      { key: 'qr.scan', label: 'Scan Product QR Codes' }
    ]
  },
  service: {
    name: 'Service & Support',
    category: 'Service',
    permissions: [
      { key: 'service.view', label: 'View Service Requests' },
      { key: 'service.create', label: 'Create Service Cases' },
      { key: 'service.edit', label: 'Update Service Cases' },
      { key: 'service.assign', label: 'Assign Cases to Engineers' },
      { key: 'service.resolve', label: 'Resolve Service Requests' },
      { key: 'service.escalate', label: 'Escalate Service Requests' },
      { key: 'service.close', label: 'Close Service Cases' }
    ]
  },
  warranty: {
    name: 'Warranty Lifecycle',
    category: 'Service',
    permissions: [
      { key: 'warranty.view', label: 'View Warranties' },
      { key: 'warranty.manage', label: 'Manage Warranty Claims' }
    ]
  },
  marketing: {
    name: 'Marketing & WhatsApp Campaigns',
    category: 'Marketing',
    permissions: [
      { key: 'marketing.view', label: 'View Marketing Hub' },
      { key: 'marketing.contacts.view', label: 'View Marketing Contacts' },
      { key: 'marketing.contacts.import', label: 'Import Contacts CSV' },
      { key: 'marketing.templates.view', label: 'View WhatsApp Templates' },
      { key: 'marketing.templates.manage', label: 'Manage & Sync Templates' },
      { key: 'marketing.campaign.view', label: 'View Campaigns' },
      { key: 'marketing.campaign.create', label: 'Create WhatsApp Campaigns' },
      { key: 'marketing.campaign.edit', label: 'Edit Campaigns' },
      { key: 'marketing.campaign.approve', label: 'Approve Campaigns' },
      { key: 'marketing.campaign.send', label: 'Launch/Send WhatsApp Campaigns' },
      { key: 'marketing.campaign.schedule', label: 'Schedule WhatsApp Campaigns' },
      { key: 'marketing.campaign.pause', label: 'Pause/Cancel Active Campaigns' },
      { key: 'marketing.analytics.view', label: 'View Marketing Analytics' },
      { key: 'marketing.whatsapp.manage', label: 'Manage WhatsApp Business Account' },
      // Legacy compatibility
      { key: 'marketing.create', label: 'Create Campaign Requests' },
      { key: 'marketing.edit', label: 'Edit Campaign Content' },
      { key: 'marketing.launch', label: 'Launch Marketing Campaigns' },
      { key: 'marketing.upload', label: 'Upload Marketing Creatives' }
    ]
  },
  finance: {
    name: 'Finance & Payments',
    category: 'Finance',
    permissions: [
      { key: 'finance.view', label: 'View Financial Summary' },
      { key: 'finance.create', label: 'Create Invoices & Bills' },
      { key: 'finance.edit', label: 'Edit Payment Entries' },
      { key: 'finance.approve', label: 'Approve Financial Dispatches' },
      { key: 'finance.refund', label: 'Issue Refunds' }
    ]
  },
  field_force: {
    name: 'Field Force & Beat Tracker',
    category: 'Field Force',
    permissions: [
      { key: 'beattracker.view', label: 'View Field Beats & Visits' },
      { key: 'beattracker.manage', label: 'Manage Routes & Assign Beats' },
      { key: 'attendance.view', label: 'View Field Attendance' },
      { key: 'attendance.mark', label: 'Mark Attendance & Check-in' }
    ]
  },
  logistics: {
    name: 'Deliveries & Logistics',
    category: 'Logistics',
    permissions: [
      { key: 'delivery.view', label: 'View Dispatches & Track Deliveries' },
      { key: 'delivery.manage', label: 'Manage Delivery Dispatches' },
      { key: 'dispatch.create', label: 'Create Dispatches' },
      { key: 'dispatch.assign', label: 'Assign Logistic Partners' },
      { key: 'logistic_partner.manage', label: 'Onboard Logistic Partners' }
    ]
  },
  reports: {
    name: 'Operational Reports',
    category: 'Analytics',
    permissions: [
      { key: 'report.view', label: 'View Operational Reports' },
      { key: 'report.export', label: 'Export Reports (Excel/CSV)' }
    ]
  },
  api_access: {
    name: 'External Partner APIs',
    category: 'Administration',
    permissions: [
      { key: 'api.view', label: 'View API Access Keys' },
      { key: 'api.manage', label: 'Generate & Revoke API Keys' },
      { key: 'api.create', label: 'Create New Integration Keys' },
      { key: 'api.revoke', label: 'Revoke Existing API Keys' }
    ]
  },
  bulk_import: {
    name: 'Bulk Data Imports',
    category: 'Core',
    permissions: [
      { key: 'bulk_import.view', label: 'View Bulk Imports' },
      { key: 'bulk_import.create', label: 'Upload CSV Files' },
      { key: 'bulk_import.validate', label: 'Run CSV Row Validation' },
      { key: 'bulk_import.execute', label: 'Commit Validated Records' },
      { key: 'bulk_import.history', label: 'View Import Job History' },
      { key: 'bulk_import.export', label: 'Export Error Logs' }
    ]
  }
};

// Administrative permissions (only delegateable by admins)
const ADMIN_PERMISSIONS = [
  { key: 'user.view', label: 'View Users', feature: 'core' },
  { key: 'user.create', label: 'Create Users', feature: 'core' },
  { key: 'user.edit', label: 'Edit Users', feature: 'core' },
  { key: 'user.disable', label: 'Disable/Deactivate Users', feature: 'core' },
  { key: 'user.unlock', label: 'Unlock Locked Accounts', feature: 'core' },
  { key: 'user.reset_password', label: 'Reset User Passwords', feature: 'core' },
  { key: 'role.view', label: 'View Roles & Permissions', feature: 'core' },
  { key: 'role.manage', label: 'Create & Manage Roles', feature: 'core' },
  { key: 'department.view', label: 'View Organization Departments', feature: 'core' },
  { key: 'department.manage', label: 'Manage Departments', feature: 'core' }
];

// Out-of-the-box standard role templates
const ROLE_TEMPLATES = {
  'sales-manager': {
    name: 'Sales Manager',
    department: 'Sales',
    description: 'Manages sales team, leads, pipeline opportunities and orders with regional visibility.',
    scopeType: 'REGION',
    permissions: [
      'lead.view', 'lead.create', 'lead.edit', 'lead.convert', 'lead.assign',
      'opportunity.view', 'opportunity.create', 'opportunity.edit', 'opportunity.assign',
      'order.view', 'order.create', 'order.edit', 'order.approve',
      'customer.view', 'customer.create', 'customer.edit',
      'inventory.view', 'inventory.transfer',
      'report.view', 'report.export'
    ]
  },
  'sales-executive': {
    name: 'Sales Executive',
    department: 'Sales',
    description: 'Handles day-to-day lead management and creates customer orders for self-assigned accounts.',
    scopeType: 'SELF',
    permissions: [
      'lead.view', 'lead.create', 'lead.edit', 'lead.convert',
      'opportunity.view', 'opportunity.create', 'opportunity.edit',
      'order.view', 'order.create',
      'customer.view', 'customer.create',
      'inventory.view'
    ]
  },
  'service-manager': {
    name: 'Service Manager',
    department: 'Service',
    description: 'Oversees service operations, assigns cases to engineers, and manages SLA resolutions.',
    scopeType: 'ALL',
    permissions: [
      'service.view', 'service.create', 'service.edit', 'service.assign', 'service.resolve', 'service.escalate', 'service.close',
      'warranty.view', 'warranty.manage',
      'customer.view', 'customer.edit',
      'serial_validation.view', 'serial_validation.validate', 'serial_validation.history',
      'report.view', 'report.export'
    ]
  },
  'service-agent': {
    name: 'Service Agent',
    department: 'Service',
    description: 'Resolves assigned customer service cases, updates case status, and verifies serial numbers.',
    scopeType: 'OWN',
    permissions: [
      'service.view', 'service.create', 'service.edit', 'service.resolve',
      'warranty.view',
      'customer.view',
      'serial_validation.view', 'serial_validation.validate'
    ]
  },
  'logistics-manager': {
    name: 'Logistics Manager',
    department: 'Logistics',
    description: 'Dispatches goods, monitors logistic partners, and manages delivery milestones.',
    scopeType: 'ALL',
    permissions: [
      'delivery.view', 'delivery.manage', 'dispatch.create', 'dispatch.assign', 'logistic_partner.manage',
      'order.view', 'inventory.view', 'inventory.transfer',
      'distribution.view', 'stock_transfer.create', 'stock_transfer.accept',
      'report.view'
    ]
  },
  'logistics-executive': {
    name: 'Logistics Executive',
    department: 'Logistics',
    description: 'Coordinates delivery dispatches and updates dispatch status.',
    scopeType: 'ALL',
    permissions: [
      'delivery.view', 'dispatch.create', 'order.view', 'inventory.view'
    ]
  },
  'inventory-manager': {
    name: 'Inventory Manager',
    department: 'Inventory',
    description: 'Maintains unit inventory, performs stock adjustments and verifies inbound stock transfers.',
    scopeType: 'ALL',
    permissions: [
      'inventory.view', 'inventory.adjust', 'inventory.transfer',
      'distribution.view', 'stock_transfer.create', 'stock_transfer.accept', 'stock_transfer.cancel',
      'product.view', 'product.create', 'product.edit',
      'serial_validation.view', 'serial_validation.import', 'serial_validation.history',
      'bulk_import.view', 'bulk_import.create', 'bulk_import.validate', 'bulk_import.execute', 'bulk_import.history',
      'report.view', 'report.export'
    ]
  },
  'finance-manager': {
    name: 'Finance Manager',
    department: 'Finance',
    description: 'Handles financial approval, tax invoices, customer refunds, and payment reconciliations.',
    scopeType: 'ALL',
    permissions: [
      'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.refund',
      'order.view', 'order.edit',
      'customer.view',
      'report.view', 'report.export'
    ]
  },
  'support-agent': {
    name: 'Support Agent',
    department: 'Support',
    description: 'Frontline customer support handling incoming requests and customer questions.',
    scopeType: 'OWN',
    permissions: [
      'customer.view', 'customer.create',
      'service.view', 'service.create', 'service.edit',
      'serial_validation.view', 'serial_validation.validate'
    ]
  }
};

/**
 * Get all available permissions grouped by feature for a given company's enabled features
 */
function getGroupedPermissionsForCompany(companyFeatures = {}) {
  const result = [];

  for (const [featureKey, featureDef] of Object.entries(FEATURE_PERMISSION_MAP)) {
    const isEnabled = companyFeatures[featureKey] !== false; // Default true if not explicitly false
    result.push({
      featureKey,
      featureName: featureDef.name,
      category: featureDef.category,
      isEnabled,
      permissions: featureDef.permissions
    });
  }

  return result;
}

/**
 * Map permission key to its governing feature
 */
function getFeatureForPermission(permissionKey) {
  for (const [featureKey, featureDef] of Object.entries(FEATURE_PERMISSION_MAP)) {
    if (featureDef.permissions.some(p => p.key === permissionKey)) {
      return featureKey;
    }
  }
  return null;
}

/**
 * Validate that all requested permissions belong to features enabled for the company
 */
function validatePermissionsAgainstEntitlements(requestedPermissions = [], companyFeatures = {}) {
  const invalidPermissions = [];

  for (const perm of requestedPermissions) {
    if (perm === '*') continue; // Admin wildcard
    const featureKey = getFeatureForPermission(perm);
    if (featureKey && companyFeatures[featureKey] === false) {
      invalidPermissions.push({
        permission: perm,
        featureKey,
        featureName: FEATURE_PERMISSION_MAP[featureKey]?.name || featureKey
      });
    }
  }

  return {
    isValid: invalidPermissions.length === 0,
    invalidPermissions
  };
}

/**
 * Filter role template permissions to only include features enabled for this company
 */
function getRoleTemplatesForCompany(companyFeatures = {}) {
  const templates = {};

  for (const [templateKey, template] of Object.entries(ROLE_TEMPLATES)) {
    const filteredPermissions = template.permissions.filter(perm => {
      const feat = getFeatureForPermission(perm);
      return !feat || companyFeatures[feat] !== false;
    });

    templates[templateKey] = {
      templateKey,
      name: template.name,
      department: template.department,
      description: template.description,
      scopeType: template.scopeType,
      permissions: filteredPermissions
    };
  }

  return templates;
}

/**
 * Validate permission delegation security
 * Ensures an actor does not delegate permissions they do not possess (unless Super/Company Admin)
 */
function canUserDelegatePermissions(actorUser, requestedPermissions = [], companyFeatures = {}) {
  if (!actorUser) return false;
  const roleStr = String(actorUser.role || '').toLowerCase();

  // Super Admin and Company Admin can delegate anything within company's enabled features
  if (['super-admin', 'superadmin', 'company-admin', 'admin'].includes(roleStr)) {
    return validatePermissionsAgainstEntitlements(requestedPermissions, companyFeatures);
  }

  // Sub-admins or managers can only delegate permissions they explicitly have
  const actorPermissions = actorUser.permissions || [];
  const unauthorizedPermissions = [];

  for (const perm of requestedPermissions) {
    if (perm === '*') {
      unauthorizedPermissions.push(perm);
      continue;
    }
    const feat = getFeatureForPermission(perm);
    if (feat && companyFeatures[feat] === false) {
      unauthorizedPermissions.push({ permission: perm, reason: 'FEATURE_DISABLED_FOR_COMPANY' });
      continue;
    }
    if (!actorPermissions.includes('*') && !actorPermissions.includes(perm)) {
      unauthorizedPermissions.push({ permission: perm, reason: 'ACTOR_LACKS_PERMISSION' });
    }
  }

  return {
    isValid: unauthorizedPermissions.length === 0,
    invalidPermissions: unauthorizedPermissions
  };
}

module.exports = {
  FEATURE_PERMISSION_MAP,
  ADMIN_PERMISSIONS,
  ROLE_TEMPLATES,
  getGroupedPermissionsForCompany,
  getFeatureForPermission,
  validatePermissionsAgainstEntitlements,
  getRoleTemplatesForCompany,
  canUserDelegatePermissions
};
