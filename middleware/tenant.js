const Company = require('../models/Company');
const { resolveTenantFromHost } = require('../services/tenantResolver');
const logger = require('../services/logger');

/**
 * Tenant Resolution Middleware:
 * Resolves trusted tenant context based on server-side authority and host resolution.
 * 
 * Rules:
 * 1. Hostname/Subdomain: Resolves host and identifies if accessing a specific tenant subdomain (e.g. abc.charliescrm.com / abc.localhost).
 * 2. API Keys: Derived strictly from verified ApiKey.companyId.
 * 3. Super Admin: Can specify X-Company-ID header or query param. Server validates company existence & status.
 * 4. Regular Users: Client header is IGNORED. req.companyId is strictly derived from user's authenticated record.
 *    If accessing via a tenant subdomain, enforces that user belongs to that specific tenant!
 */
const resolveTenant = async (req, res, next) => {
  try {
    // 0. Resolve Host & Subdomain
    const hostInfo = await resolveTenantFromHost(req);
    req.tenantResolution = hostInfo;

    // If host resolved to a specific company tenant via subdomain
    if (hostInfo.company) {
      if (hostInfo.company.status === 'SUSPENDED') {
        return res.status(403).json({ 
          error: 'Tenant subscription is currently suspended. Please contact platform billing/support.',
          code: 'TENANT_SUSPENDED'
        });
      }
      if (hostInfo.company.status === 'DEACTIVATED' || !hostInfo.company.isActive) {
        return res.status(404).json({ 
          error: 'Tenant workspace is inactive or does not exist.',
          code: 'TENANT_INACTIVE'
        });
      }
    }

    // 1. If API Key authenticated
    if (req.apiKey) {
      if (!req.apiKey.companyId) {
        return res.status(403).json({ error: 'API key is not assigned to any company tenant' });
      }
      req.companyId = req.apiKey.companyId;
      return next();
    }

    // 2. If JWT User authenticated
    if (req.user) {
      const userRole = String(req.user.role || '').toLowerCase();
      const isSuperAdmin = userRole === 'super-admin' || userRole === 'superadmin';

      if (isSuperAdmin) {
        // Super Admin context selection
        // Priority 1: Subdomain company if accessed on a tenant subdomain
        // Priority 2: X-Company-ID or ?companyId for explicit switching in console
        let targetCompanyId = null;
        if (hostInfo.company) {
          targetCompanyId = hostInfo.company._id;
        } else {
          const requestedCompanyId = req.headers['x-company-id'] || req.query.companyId;
          if (requestedCompanyId && requestedCompanyId !== 'null' && requestedCompanyId !== 'undefined') {
            targetCompanyId = requestedCompanyId;
          }
        }

        if (targetCompanyId) {
          const company = await Company.findById(targetCompanyId).lean();
          if (!company) {
            return res.status(404).json({ error: 'Selected company not found' });
          }
          req.companyId = company._id;
          req.company = company;
        } else {
          // Super Admin global overview mode
          req.companyId = null;
        }
        return next();
      }

      // Regular company user / company-admin / sales / etc.
      // ALWAYS derive companyId from the user token/profile, NEVER trust client headers!
      if (!req.user.companyId) {
        return res.status(403).json({ error: 'User is not assigned to an active company tenant' });
      }

      // If accessing via a specific tenant subdomain, enforce matching company!
      if (hostInfo.company && String(req.user.companyId) !== String(hostInfo.company._id)) {
        return res.status(403).json({ 
          error: 'Access denied: your account is not authorized to access this tenant workspace',
          code: 'TENANT_MISMATCH'
        });
      }

      // Verify company status
      const company = hostInfo.company && String(hostInfo.company._id) === String(req.user.companyId)
        ? hostInfo.company
        : await Company.findById(req.user.companyId).lean();

      if (!company || company.status === 'DEACTIVATED' || !company.isActive) {
        return res.status(403).json({ error: 'Your company tenant is inactive or not found' });
      }
      if (company.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Your company tenant subscription is suspended' });
      }

      req.companyId = company._id;
      req.company = company;
      return next();
    }

    // Unauthenticated requests continue (e.g. public branding or health endpoints)
    if (hostInfo.company) {
      req.companyId = hostInfo.company._id;
      req.company = hostInfo.company;
    }

    next();
  } catch (err) {
    logger.error('Error in tenant resolution middleware:', err);
    res.status(500).json({ error: 'Internal tenant resolution error' });
  }
};

/**
 * Middleware that strictly enforces a valid companyId is present.
 */
const requireTenant = (req, res, next) => {
  if (!req.companyId) {
    return res.status(400).json({ 
      error: 'Company context required. Please select or specify an active company.' 
    });
  }
  next();
};

/**
 * Helper to apply companyId filter to Mongoose query objects
 */
const scopeQuery = (req, baseFilter = {}) => {
  if (req.companyId) {
    return { ...baseFilter, companyId: req.companyId };
  }
  return baseFilter;
};

module.exports = {
  resolveTenant,
  requireTenant,
  scopeQuery
};
