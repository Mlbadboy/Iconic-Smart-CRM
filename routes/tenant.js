const express = require('express');
const Company = require('../models/Company');
const { resolveTenantFromHost } = require('../services/tenantResolver');
const { auth } = require('../middleware/auth');
const logger = require('../services/logger');

const router = express.Router();

// Platform Default Branding
const PLATFORM_BRANDING = {
  isPlatform: true,
  subdomain: null,
  displayName: "Charlie's CRM Platform",
  logo: null,
  favicon: null,
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  accentColor: '#3B82F6',
  loginHeading: "Charlie's CRM",
  loginSubtitle: 'Multi-Tenant SaaS & Enterprise CRM Platform'
};

/**
 * GET /api/tenant/branding
 * Public endpoint that dynamically returns white-label branding for the current host/subdomain.
 */
router.get('/branding', async (req, res) => {
  try {
    let company = null;
    let isPlatform = false;
    let subdomain = null;

    // 0. Check if authenticated token is supplied to resolve logged-in tenant branding
    const jwt = require('jsonwebtoken');
    const authHeader = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
    if (authHeader && !req.query.subdomain && !req.query.companyId) {
      try {
        const decoded = jwt.verify(authHeader, process.env.JWT_SECRET || 'your_secret_key');
        if (decoded && decoded.companyId) {
          company = await Company.findById(decoded.companyId).lean();
          if (company) {
            subdomain = company.subdomain;
            isPlatform = false;
          }
        }
      } catch (e) {}
    }

    // 1. Check if specified via explicit query parameter
    if (!company && req.query.subdomain) {
      subdomain = String(req.query.subdomain).toLowerCase().trim();
      company = await Company.findOne({ subdomain }).lean();
    } else if (!company && req.query.companyId) {
      company = await Company.findById(req.query.companyId).lean();
      subdomain = company?.subdomain || null;
    } else if (!company) {
      // 2. Resolve from Hostname / Subdomain
      const hostInfo = await resolveTenantFromHost(req);
      isPlatform = hostInfo.isPlatform;
      subdomain = hostInfo.subdomain;
      company = hostInfo.company;
    }

    if (isPlatform || !company) {
      return res.json(PLATFORM_BRANDING);
    }

    // Check if suspended
    if (company.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Tenant subscription suspended',
        code: 'TENANT_SUSPENDED',
        displayName: company.displayName || company.name,
        reason: company.suspensionReason
      });
    }

    const branding = company.branding || {};
    const responsePayload = {
      isPlatform: false,
      subdomain: company.subdomain || subdomain,
      displayName: company.displayName || company.name,
      logo: branding.logo || company.logo || null,
      favicon: branding.favicon || null,
      primaryColor: branding.primaryColor || '#667eea',
      secondaryColor: branding.secondaryColor || '#764ba2',
      accentColor: branding.accentColor || '#3B82F6',
      loginHeading: branding.loginBranding?.heading || company.displayName || company.name,
      loginSubtitle: branding.loginBranding?.subtitle || 'Enterprise CRM Workspace'
    };

    res.json(responsePayload);
  } catch (err) {
    logger.error('Error fetching tenant branding:', err);
    res.status(500).json({ error: 'Failed to retrieve tenant branding' });
  }
});

/**
 * GET /api/tenant/entitlements
 * Authenticated endpoint for Company Admin & Users to query their company's enabled features,
 * subscription lifecycle, and storage limits.
 */
router.get('/entitlements', auth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const companyId = req.user?.companyId;
    if (!companyId) {
      // Super Admin default full access
      return res.json({
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        features: {
          dashboard: true,
          sales: true,
          customers: true,
          orders: true,
          products: true,
          inventory: true,
          distribution: true,
          serial_validation: true,
          qr_verification: true,
          service: true,
          warranty: true,
          marketing: true,
          finance: true,
          field_force: true,
          logistics: true,
          reports: true,
          api_access: true,
          analytics: true
        }
      });
    }

    const company = await Company.findById(companyId).select('name subdomain status suspensionReason billing storage features updatedAt').lean();
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const storageLimit = company.storage?.storageLimitBytes || 5368709120;
    const storageUsed = company.storage?.storageUsedBytes || 0;
    const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

    res.json({
      companyId: company._id,
      name: company.name,
      subdomain: company.subdomain,
      status: company.status,
      suspensionReason: company.suspensionReason || null,
      plan: company.billing?.plan || 'STARTER',
      billingCycle: company.billing?.billingCycle || 'MONTHLY',
      subscriptionEnd: company.billing?.subscriptionEnd || null,
      paymentStatus: company.billing?.paymentStatus || 'PAID',
      storage: {
        storageLimitBytes: storageLimit,
        storageUsedBytes: storageUsed,
        storagePercent
      },
      features: company.features || {},
      entitlementUpdatedAt: company.updatedAt || new Date()
    });
  } catch (err) {
    logger.error('Error fetching tenant entitlements:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tenant/entitlements/debug
 * Diagnostic endpoint returning authoritative database state for company feature verification.
 */
router.get('/entitlements/debug', auth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.json({
        role: req.user?.role,
        isSuperAdmin: true,
        message: 'Super Admin has global platform permissions'
      });
    }

    const company = await Company.findById(companyId).select('name subdomain status billing.plan features updatedAt').lean();
    if (!company) {
      return res.status(404).json({ error: 'Company record not found in database' });
    }

    res.json({
      companyId: company._id,
      companyName: company.name,
      subdomain: company.subdomain,
      status: company.status,
      plan: company.billing?.plan || 'CUSTOM',
      features: company.features || {},
      entitlementUpdatedAt: company.updatedAt,
      queriedAt: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tenant/me
 * Returns the current authenticated user's company profile and feature entitlements
 */
router.get('/me', auth, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.json({
        success: true,
        isSuperAdmin: true,
        user: req.user,
        company: { name: "Charlie's Platform Admin", features: { marketing: true } }
      });
    }

    const company = await Company.findById(companyId).lean();
    if (!company) return res.status(404).json({ error: 'Company not found' });

    res.json({
      success: true,
      company,
      user: req.user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
