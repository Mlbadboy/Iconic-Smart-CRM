const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const UnifiedCampaign = require('../models/UnifiedCampaign');
const OmnichannelSchedule = require('../models/OmnichannelSchedule');
const unifiedCampaignEngine = require('../services/unifiedCampaignEngine');
const omnichannelAttributionEngine = require('../services/omnichannelAttributionEngine');

// List all unified campaigns for company
router.get('/', auth, async (req, res) => {
  try {
    const campaigns = await UnifiedCampaign.find({ companyId: req.user.companyId }).sort({ createdAt: -1 });
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Company-wide attribution and ROAS overview
router.get('/attribution-overview', auth, async (req, res) => {
  try {
    const overview = await omnichannelAttributionEngine.calculateCompanyAttributionOverview(req.user.companyId);
    res.json({ success: true, ...overview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new unified campaign
router.post('/', auth, async (req, res) => {
  try {
    const { name, objective, channels, targetAudience, budget, assets } = req.body;
    const campaign = await unifiedCampaignEngine.createUnifiedCampaign(
      req.user.companyId,
      req.user._id,
      { name, objective, channels, targetAudience, budget, assets }
    );
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 1-Click Multi-Channel Holiday Roadmap Generation
router.post('/holiday-roadmap', auth, async (req, res) => {
  try {
    const { holidayName } = req.body;
    const result = await unifiedCampaignEngine.generateHolidayRoadmap(
      req.user.companyId,
      req.user._id,
      holidayName || 'Diwali Grand Festival'
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Run Preflight Audit on Campaign
router.post('/:id/preflight', auth, async (req, res) => {
  try {
    const snapshot = await unifiedCampaignEngine.runCampaignPreflight(req.user.companyId, req.params.id);
    res.json({ success: true, snapshot });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get Closed-Loop Attribution & ROAS report for Campaign
router.get('/:id/attribution', auth, async (req, res) => {
  try {
    const report = await omnichannelAttributionEngine.calculateCampaignAttribution(req.user.companyId, req.params.id);
    res.json({ success: true, attribution: report });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get Omnichannel Schedules / Calendar
router.get('/schedules/all', auth, async (req, res) => {
  try {
    const schedules = await OmnichannelSchedule.find({ companyId: req.user.companyId }).sort({ scheduledDate: 1, scheduledTime: 1 });
    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
