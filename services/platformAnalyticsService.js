const mongoose = require('mongoose');
const PlatformUsageEvent = require('../models/PlatformUsageEvent');
const Company = require('../models/Company');
const User = require('../models/User');
const Order = require('../models/Order');
const SerialRegistry = require('../models/SerialRegistry');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const StockTransfer = require('../models/StockTransfer');
const ServiceRequest = require('../models/ServiceRequest');
const ApiKey = require('../models/ApiKey');
const logger = require('./logger');

/**
 * Asynchronously record a platform usage event
 */
async function trackPlatformEvent({ companyId, userId, module, action, status = 'SUCCESS', metadata = {} }) {
  if (!companyId) return;
  try {
    const event = new PlatformUsageEvent({
      companyId,
      userId: userId || null,
      module,
      action,
      status,
      metadata,
      timestamp: new Date()
    });
    await event.save();
  } catch (err) {
    logger.warn('Failed to record platform usage event:', err.message);
  }
}

/**
 * Super Admin Top-Level Platform KPIs
 */
async function getPlatformKPIs() {
  const totalCompanies = await Company.countDocuments({});
  const activeCompanies = await Company.countDocuments({ status: 'ACTIVE' });
  const suspendedCompanies = await Company.countDocuments({ status: { $in: ['SUSPENDED', 'DEACTIVATED'] } });

  const totalUsers = await User.countDocuments({});
  const activeUsers = await User.countDocuments({ isActive: true });

  const totalUnits = await SerialRegistry.countDocuments({});
  const totalOrders = await Order.countDocuments({});
  const totalTransfers = await StockTransfer.countDocuments({});
  const totalTransactions = totalOrders + totalTransfers;

  const totalApiRequests = await SerialValidationHistory.countDocuments({});
  const uniqueSerialsList = await SerialValidationHistory.distinct('serialNumber');

  return {
    totalCompanies,
    activeCompanies,
    suspendedCompanies,
    totalUsers,
    activeUsers,
    totalUnits,
    totalTransactions,
    totalApiRequests,
    totalSerialValidations: uniqueSerialsList.length,
    uptime: process.uptime()
  };
}

/**
 * Feature Utilization & Adoption Breakdown
 */
async function getFeatureUtilization(period = '30d') {
  const now = new Date();
  let dateQuery = {};
  if (period === '7d') {
    dateQuery = { timestamp: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
  } else if (period === '30d') {
    dateQuery = { timestamp: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
  }

  // Get total events in period
  const totalEvents = await PlatformUsageEvent.countDocuments(dateQuery);

  const featureAgg = await PlatformUsageEvent.aggregate([
    { $match: dateQuery },
    {
      $group: {
        _id: '$module',
        totalUsage: { $sum: 1 },
        companies: { $addToSet: '$companyId' },
        users: { $addToSet: '$userId' }
      }
    },
    { $sort: { totalUsage: -1 } }
  ]);

  const totalUsageSum = totalEvents || 1;

  const featuresList = [
    'SALES',
    'INVENTORY',
    'SERIAL_VALIDATION',
    'SERVICE',
    'API',
    'REPORTS',
    'MARKETING',
    'DISTRIBUTION'
  ];

  const resultMap = new Map(featureAgg.map(item => [item._id, item]));

  const breakdown = featuresList.map(featureKey => {
    const data = resultMap.get(featureKey);
    const totalUsage = data ? data.totalUsage : 0;
    const activeCompanies = data ? data.companies.length : 0;
    const activeUsers = data ? data.users.filter(Boolean).length : 0;
    const percentage = totalEvents > 0 ? Number(((totalUsage / totalUsageSum) * 100).toFixed(1)) : 0;

    return {
      feature: featureKey,
      label: formatFeatureLabel(featureKey),
      totalUsage,
      activeCompanies,
      activeUsers,
      percentage
    };
  });

  return {
    period,
    totalEvents,
    breakdown: breakdown.sort((a, b) => b.totalUsage - a.totalUsage)
  };
}

function formatFeatureLabel(key) {
  const map = {
    'SALES': 'Sales & Orders',
    'INVENTORY': 'Product & Unit Inventory',
    'SERIAL_VALIDATION': 'Serial Number Validation',
    'SERVICE': 'Service & Support Cases',
    'API': 'External API Access',
    'REPORTS': 'Reports & Exports',
    'MARKETING': 'Marketing & Campaigns',
    'DISTRIBUTION': 'Distribution & Stock Transfers'
  };
  return map[key] || key;
}

/**
 * Super Admin Company Comparison Matrix & CRM Adoption Score
 */
async function getCompanyComparison() {
  const companies = await Company.find({}).select('name code subdomain status billing createdAt').lean();

  const comparison = await Promise.all(companies.map(async (comp) => {
    const userCount = await User.countDocuments({ companyId: comp._id });
    const orderCount = await Order.countDocuments({ companyId: comp._id });
    const unitCount = await SerialRegistry.countDocuments({ companyId: comp._id });
    const apiCallCount = await SerialValidationHistory.countDocuments({ companyId: comp._id });
    const serialCheckCount = (await SerialValidationHistory.distinct('serialNumber', { companyId: comp._id })).length;
    const serviceCaseCount = await ServiceRequest.countDocuments({ companyId: comp._id });
    const transferCount = await StockTransfer.countDocuments({ companyId: comp._id });

    // Adoption score calculation (0 - 100) based on module engagement
    let score = 0;
    if (userCount > 1) score += 15;
    if (orderCount > 0) score += 20;
    if (unitCount > 0) score += 15;
    if (apiCallCount > 0) score += 20;
    if (serviceCaseCount > 0) score += 15;
    if (transferCount > 0) score += 15;

    let tier = 'LOW';
    if (score >= 70) tier = 'HIGH';
    else if (score >= 40) tier = 'MEDIUM';

    return {
      companyId: comp._id,
      companyName: comp.name,
      companyCode: comp.code,
      subdomain: comp.subdomain,
      status: comp.status,
      plan: comp.billing?.plan || 'STARTER',
      users: userCount,
      orders: orderCount,
      units: unitCount,
      apiCalls: apiCallCount,
      serialChecks: serialCheckCount,
      serviceCases: serviceCaseCount,
      transfers: transferCount,
      adoptionScore: score,
      adoptionTier: tier
    };
  }));

  return comparison.sort((a, b) => b.adoptionScore - a.adoptionScore);
}

/**
 * Super Admin Single Company Drill-down Summary
 */
async function getCompanyAnalyticsDrilldown(companyId) {
  const comp = await Company.findById(companyId).lean();
  if (!comp) throw new Error('Company not found');

  const users = await User.countDocuments({ companyId: comp._id });
  const orders = await Order.countDocuments({ companyId: comp._id });
  const units = await SerialRegistry.countDocuments({ companyId: comp._id });
  const soldUnits = await SerialRegistry.countDocuments({ companyId: comp._id, status: 'VALIDATED' });
  const inTransitUnits = await SerialRegistry.countDocuments({ companyId: comp._id, status: 'IN_TRANSIT' });

  const apiRequests = await SerialValidationHistory.countDocuments({ companyId: comp._id });
  const serialValidations = (await SerialValidationHistory.distinct('serialNumber', { companyId: comp._id })).length;
  const successfulValidations = await SerialValidationHistory.countDocuments({ companyId: comp._id, validationResult: 'VALID' });

  // Feature adoption for this company
  const featureCounts = await PlatformUsageEvent.aggregate([
    { $match: { companyId: comp._id } },
    { $group: { _id: '$module', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const mostUsedFeature = featureCounts[0] ? formatFeatureLabel(featureCounts[0]._id) : 'General CRM';

  return {
    company: {
      id: comp._id,
      name: comp.name,
      displayName: comp.displayName,
      code: comp.code,
      subdomain: comp.subdomain,
      status: comp.status,
      plan: comp.billing?.plan || 'STARTER',
      createdAt: comp.createdAt
    },
    metrics: {
      users,
      orders,
      totalUnits: units,
      soldUnits,
      inTransitUnits,
      apiRequests,
      serialValidations,
      successfulValidations,
      mostUsedFeature
    },
    featureActivity: featureCounts.map(f => ({
      feature: f._id,
      label: formatFeatureLabel(f._id),
      actions: f.count
    }))
  };
}

/**
 * Platform Health & Operational Metrics
 */
async function getPlatformHealth() {
  const dbState = mongoose.connection.readyState === 1 ? 'HEALTHY' : 'DEGRADED';
  const totalApiErrors = await SerialValidationHistory.countDocuments({
    validationResult: { $in: ['SERVICE_ERROR', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR'] }
  });
  const rateLimitEvents = await SerialValidationHistory.countDocuments({
    validationResult: 'RATE_LIMITED'
  });

  return {
    status: dbState === 'HEALTHY' ? 'OPERATIONAL' : 'DEGRADED',
    databaseStatus: dbState,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    apiErrorCount: totalApiErrors,
    rateLimitEvents,
    lastChecked: new Date().toISOString()
  };
}

module.exports = {
  trackPlatformEvent,
  getPlatformKPIs,
  getFeatureUtilization,
  getCompanyComparison,
  getCompanyAnalyticsDrilldown,
  getPlatformHealth
};
