const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getPlatformKPIs,
  getFeatureUtilization,
  getCompanyComparison,
  getCompanyAnalyticsDrilldown,
  getPlatformHealth
} = require('../services/platformAnalyticsService');
const logger = require('../services/logger');

const router = express.Router();

const isSuperAdminUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'super-admin' || role === 'superadmin';
};

// Middleware: restrict to Platform Super Admin
const superAdminOnly = (req, res, next) => {
  if (!isSuperAdminUser(req.user)) {
    return res.status(403).json({ error: 'Super Administrator platform access required' });
  }
  next();
};

// 1. Top-Level Platform KPIs
router.get('/kpis', auth, superAdminOnly, async (req, res) => {
  try {
    const kpis = await getPlatformKPIs();
    res.json(kpis);
  } catch (err) {
    logger.error('Error fetching platform KPIs:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Feature Utilization & Adoption Breakdown
router.get('/features', auth, superAdminOnly, async (req, res) => {
  try {
    const { period } = req.query;
    const utilization = await getFeatureUtilization(period || '30d');
    res.json(utilization);
  } catch (err) {
    logger.error('Error fetching feature utilization:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Company Comparison & CRM Adoption Matrix
router.get('/companies', auth, superAdminOnly, async (req, res) => {
  try {
    const comparison = await getCompanyComparison();
    res.json(comparison);
  } catch (err) {
    logger.error('Error fetching company comparison:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Single Company Analytics Drill-Down
router.get('/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const drilldown = await getCompanyAnalyticsDrilldown(req.params.id);
    res.json(drilldown);
  } catch (err) {
    logger.error('Error fetching company analytics drilldown:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Platform Health & Diagnostics
router.get('/health', auth, superAdminOnly, async (req, res) => {
  try {
    const health = await getPlatformHealth();
    res.json(health);
  } catch (err) {
    logger.error('Error fetching platform health:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
