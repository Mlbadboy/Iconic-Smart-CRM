const express = require('express');
const Company = require('../models/Company');
const User = require('../models/User');
const Order = require('../models/Order');
const SerialRegistry = require('../models/SerialRegistry');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const PlatformNotification = require('../models/PlatformNotification');
const { auth } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');
const logger = require('../services/logger');

const router = express.Router();

const isSuperAdmin = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'super-admin' || role === 'superadmin';
};

const superAdminOnly = (req, res, next) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Super Administrator platform access required' });
  }
  next();
};

// Plan defaults mapping
const PLAN_DEFAULT_FEATURES = {
  STARTER: {
    dashboard: true,
    sales: true,
    customers: true,
    orders: true,
    products: true,
    inventory: false,
    distribution: false,
    serial_validation: false,
    qr_verification: false,
    service: false,
    warranty: false,
    marketing: false,
    finance: false,
    field_force: false,
    logistics: false,
    reports: true,
    api_access: false,
    analytics: false,
    bulk_import: false
  },
  PROFESSIONAL: {
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
    marketing: false,
    finance: false,
    field_force: true,
    logistics: true,
    reports: true,
    api_access: true,
    analytics: true,
    bulk_import: true
  },
  ENTERPRISE: {
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
    analytics: true,
    bulk_import: true
  }
};

// 1. List all companies with control metrics
router.get('/overview/list', auth, superAdminOnly, async (req, res) => {
  try {
    const companies = await Company.find({}).sort({ createdAt: -1 }).lean();

    const overview = await Promise.all(companies.map(async (comp) => {
      const userCount = await User.countDocuments({ companyId: comp._id });
      const orderCount = await Order.countDocuments({ companyId: comp._id });
      const unitCount = await SerialRegistry.countDocuments({ companyId: comp._id });
      const apiCalls = await SerialValidationHistory.countDocuments({ companyId: comp._id });

      const features = comp.features || {};
      const enabledFeaturesCount = Object.values(features).filter(Boolean).length;
      const totalFeaturesCount = Object.keys(features).length || 18;

      const storageLimit = comp.storage?.storageLimitBytes || 5368709120; // 5 GB
      const storageUsed = comp.storage?.storageUsedBytes || 0;
      const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

      return {
        id: comp._id,
        name: comp.name,
        code: comp.code,
        subdomain: comp.subdomain,
        status: comp.status,
        plan: comp.billing?.plan || 'STARTER',
        subscriptionEnd: comp.billing?.subscriptionEnd || null,
        paymentStatus: comp.billing?.paymentStatus || 'PAID',
        userCount,
        orderCount,
        unitCount,
        apiCalls,
        enabledFeaturesCount,
        totalFeaturesCount,
        storagePercent,
        storageUsedBytes: storageUsed,
        storageLimitBytes: storageLimit,
        features: comp.features || {}
      };
    }));

    res.json(overview);
  } catch (err) {
    logger.error('Error listing tenant control overview:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get full control details for a single company
router.get('/:companyId', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).lean();
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const [userCount, orderCount, unitCount, apiCalls] = await Promise.all([
      User.countDocuments({ companyId: company._id }),
      Order.countDocuments({ companyId: company._id }),
      SerialRegistry.countDocuments({ companyId: company._id }),
      SerialValidationHistory.countDocuments({ companyId: company._id })
    ]);

    res.json({
      company,
      metrics: {
        userCount,
        orderCount,
        unitCount,
        apiCalls
      },
      planDefaults: PLAN_DEFAULT_FEATURES
    });
  } catch (err) {
    logger.error('Error fetching tenant control details:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Feature Entitlements
router.patch('/:companyId/features', auth, superAdminOnly, async (req, res) => {
  try {
    const { features } = req.body;
    if (!features || typeof features !== 'object') {
      return res.status(400).json({ error: 'Invalid features payload' });
    }

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const oldFeatures = JSON.parse(JSON.stringify(company.features || {}));

    if (!company.features) company.features = {};
    for (const [featKey, isEnabled] of Object.entries(features)) {
      company.features[featKey] = Boolean(isEnabled);
    }
    company.markModified('features');
    await company.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.features_update',
      entity: 'Company',
      entityId: company._id,
      oldValue: oldFeatures,
      newValue: company.features
    });

    res.json({
      message: 'Feature entitlements updated successfully',
      features: company.features
    });
  } catch (err) {
    logger.error('Error updating feature entitlements:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Subscription & Storage Metadata
router.patch('/:companyId/subscription', auth, superAdminOnly, async (req, res) => {
  try {
    const {
      plan,
      billingCycle,
      subscriptionEnd,
      paymentStatus,
      amount,
      currency,
      storageLimitBytes,
      storageWarningThreshold,
      storageCriticalThreshold,
      applyPlanDefaultFeatures
    } = req.body;

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const oldBilling = JSON.parse(JSON.stringify(company.billing || {}));

    if (!company.billing) company.billing = {};
    if (plan) company.billing.plan = plan;
    if (billingCycle) company.billing.billingCycle = billingCycle;
    if (subscriptionEnd !== undefined) company.billing.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null;
    if (paymentStatus) company.billing.paymentStatus = paymentStatus;
    if (amount !== undefined) company.billing.amount = Number(amount);
    if (currency) company.billing.currency = currency;

    if (!company.storage) company.storage = {};
    if (storageLimitBytes !== undefined) company.storage.storageLimitBytes = Number(storageLimitBytes);
    if (storageWarningThreshold !== undefined) company.storage.storageWarningThreshold = Number(storageWarningThreshold);
    if (storageCriticalThreshold !== undefined) company.storage.storageCriticalThreshold = Number(storageCriticalThreshold);

    // Optional: apply plan default features if requested
    if (applyPlanDefaultFeatures && plan && PLAN_DEFAULT_FEATURES[plan]) {
      company.features = { ...PLAN_DEFAULT_FEATURES[plan] };
      company.markModified('features');
    }

    company.markModified('billing');
    company.markModified('storage');
    await company.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.subscription_update',
      entity: 'Company',
      entityId: company._id,
      oldValue: oldBilling,
      newValue: company.billing
    });

    res.json({
      message: 'Subscription and storage updated successfully',
      billing: company.billing,
      storage: company.storage,
      features: company.features
    });
  } catch (err) {
    logger.error('Error updating subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Suspend Tenant
router.post('/:companyId/suspend', auth, superAdminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const oldStatus = company.status;
    company.status = 'SUSPENDED';
    company.isActive = false;
    company.suspensionReason = reason?.trim() || 'Suspended by platform administrator';
    company.suspendedAt = new Date();
    await company.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.suspend',
      entity: 'Company',
      entityId: company._id,
      oldValue: { status: oldStatus },
      newValue: { status: 'SUSPENDED', reason: company.suspensionReason }
    });

    res.json({
      message: `Company '${company.name}' has been SUSPENDED.`,
      status: company.status,
      suspensionReason: company.suspensionReason
    });
  } catch (err) {
    logger.error('Error suspending company:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Reactivate Tenant
router.post('/:companyId/reactivate', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const oldStatus = company.status;
    company.status = 'ACTIVE';
    company.isActive = true;
    company.suspensionReason = null;
    company.reactivatedAt = new Date();
    await company.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.reactivate',
      entity: 'Company',
      entityId: company._id,
      oldValue: { status: oldStatus },
      newValue: { status: 'ACTIVE' }
    });

    res.json({
      message: `Company '${company.name}' has been REACTIVATED to ACTIVE status.`,
      status: company.status
    });
  } catch (err) {
    logger.error('Error reactivating company:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
