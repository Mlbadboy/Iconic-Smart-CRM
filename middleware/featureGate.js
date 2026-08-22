const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const logger = require('../services/logger');

const isSuperAdmin = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'super-admin' || role === 'superadmin';
};

/**
 * Middleware factory to enforce tenant-level feature entitlements and lifecycle status
 * @param {string} featureKey - Key of the feature (e.g. 'inventory', 'service', 'serial_validation', 'sales')
 */
const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      let targetCompanyId = req.user?.companyId || req.companyId || req.query.companyId || req.headers['x-company-id'] || req.apiKey?.companyId;
      let userRole = req.user?.role;

      // If req.user is not yet populated by prior middleware, attempt to parse from Authorization header
      if (!targetCompanyId && req.headers?.authorization?.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
          targetCompanyId = decoded.companyId;
          userRole = decoded.role;
        } catch (e) {
          // Will be handled by downstream auth middleware
        }
      }

      // Super Admin bypass if not operating in scoped company context
      const roleStr = String(userRole || '').toLowerCase();
      if ((roleStr === 'super-admin' || roleStr === 'superadmin') && !targetCompanyId) {
        return next();
      }

      if (!targetCompanyId) {
        return next(); // If no company is associated, let normal auth/RBAC handle permission
      }

      const company = await Company.findById(targetCompanyId).select('status suspensionReason features billing').lean();
      if (!company) {
        return res.status(404).json({ error: 'Company not found', code: 'COMPANY_NOT_FOUND' });
      }

      // 1. Check Tenant Lifecycle Suspension
      if (company.status === 'SUSPENDED' || company.status === 'DEACTIVATED') {
        return res.status(403).json({
          error: 'Your CRM subscription is currently inactive or suspended.',
          code: 'TENANT_SUSPENDED',
          status: company.status,
          reason: company.suspensionReason || 'Subscription suspended by platform administrator',
          subscriptionEnd: company.billing?.subscriptionEnd || null
        });
      }

      // 2. Check Feature Entitlement
      if (featureKey && company.features) {
        const isEnabled = company.features[featureKey] !== false;
        if (!isEnabled) {
          logger.warn(`🚫 Feature gate blocked: '${featureKey}' is disabled for company '${company._id}'`);
          return res.status(403).json({
            error: `The '${featureKey}' module is not enabled for your company subscription.`,
            code: 'FEATURE_NOT_ENABLED',
            feature: featureKey
          });
        }
      }

      req.company = company;
      next();
    } catch (err) {
      logger.error('Error in featureGate middleware:', err);
      res.status(500).json({ error: 'Internal server error in feature entitlement validation' });
    }
  };
};

module.exports = {
  requireFeature
};
