const express = require('express');
const { auth } = require('../middleware/auth');
const Company = require('../models/Company');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppUsage = require('../models/WhatsAppUsage');
const WhatsAppWallet = require('../models/WhatsAppWallet');
const { recordAuditEvent } = require('../services/auditService');
const logger = require('../services/logger');

const router = express.Router();

// Strict Super Admin Gatekeeper
const requireSuperAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'super-admin' && role !== 'superadmin') {
    return res.status(403).json({
      message: 'Access denied: Platform Super Administrator privilege required',
      code: 'FORBIDDEN'
    });
  }
  next();
};

router.use(auth);
router.use(requireSuperAdmin);

/**
 * Super Admin Global WhatsApp Overview
 */
router.get('/overview', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    const [
      totalCompanies,
      connectedAccounts,
      activeCampaigns,
      todayAgg,
      monthAgg
    ] = await Promise.all([
      Company.countDocuments({ isActive: true }),
      WhatsAppAccount.countDocuments({ connectionStatus: 'CONNECTED' }),
      WhatsAppCampaign.countDocuments({ status: { $in: ['PROCESSING', 'QUEUED'] } }),
      WhatsAppUsage.aggregate([
        { $match: { date: todayStr } },
        {
          $group: {
            _id: null,
            sent: { $sum: '$messagesSent' },
            delivered: { $sum: '$messagesDelivered' },
            failed: { $sum: '$messagesFailed' },
            cost: { $sum: '$totalCost' }
          }
        }
      ]),
      WhatsAppUsage.aggregate([
        { $match: { month: monthStr } },
        {
          $group: {
            _id: null,
            sent: { $sum: '$messagesSent' },
            delivered: { $sum: '$messagesDelivered' },
            read: { $sum: '$messagesRead' },
            failed: { $sum: '$messagesFailed' },
            marketing: { $sum: '$marketingCount' },
            utility: { $sum: '$utilityCount' },
            totalCost: { $sum: '$totalCost' },
            platformFee: { $sum: '$platformFee' }
          }
        }
      ])
    ]);

    const todayStats = todayAgg[0] || { sent: 0, delivered: 0, failed: 0, cost: 0 };
    const monthStats = monthAgg[0] || { sent: 0, delivered: 0, read: 0, failed: 0, marketing: 0, utility: 0, totalCost: 0, platformFee: 0 };

    const deliveryRate = monthStats.sent > 0 ? Number(((monthStats.delivered / monthStats.sent) * 100).toFixed(1)) : 0;
    const failureRate = monthStats.sent > 0 ? Number(((monthStats.failed / monthStats.sent) * 100).toFixed(1)) : 0;

    res.json({
      connectedCompanies: connectedAccounts,
      totalCompanies,
      activeCampaigns,
      messagesToday: todayStats.sent,
      messagesThisMonth: monthStats.sent,
      marketingMessages: monthStats.marketing,
      utilityMessages: monthStats.utility,
      deliveryRate,
      failureRate,
      platformRevenue: Number((monthStats.totalCost * 0.15).toFixed(2)) // Estimated platform fee revenue
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * List all tenants with WhatsApp Matrix
 */
router.get('/tenants', async (req, res) => {
  try {
    const companies = await Company.find({}).sort({ name: 1 });
    const accounts = await WhatsAppAccount.find({});
    const wallets = await WhatsAppWallet.find({});

    const monthStr = new Date().toISOString().substring(0, 7);
    const monthUsages = await WhatsAppUsage.aggregate([
      { $match: { month: monthStr } },
      {
        $group: {
          _id: '$companyId',
          totalSent: { $sum: '$messagesSent' },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);

    const accountMap = new Map(accounts.map(a => [String(a.companyId), a]));
    const walletMap = new Map(wallets.map(w => [String(w.companyId), w]));
    const usageMap = new Map(monthUsages.map(u => [String(u._id), u]));

    const matrix = companies.map(c => {
      const cId = String(c._id);
      const acc = accountMap.get(cId);
      const wal = walletMap.get(cId);
      const usg = usageMap.get(cId);
      const cfg = c.features?.marketing_config || {};

      return {
        id: c._id,
        name: c.name,
        code: c.code,
        plan: c.billing?.plan || 'STARTER',
        marketingEnabled: c.features?.marketing !== false,
        whatsappEnabled: cfg.whatsapp !== false,
        bulkCampaignsEnabled: cfg.bulk_campaigns !== false,
        mediaCampaignsEnabled: cfg.media_campaigns !== false,
        monthlyLimit: cfg.monthly_message_limit || 50000,
        dailyLimit: cfg.daily_message_limit || 5000,
        connectionStatus: acc ? acc.connectionStatus : 'NOT_CONFIGURED',
        displayPhoneNumber: acc?.displayPhoneNumber || 'N/A',
        verifiedName: acc?.verifiedName || 'N/A',
        walletBalance: wal ? wal.balance : 0,
        monthUsage: usg ? usg.totalSent : 0
      };
    });

    res.json({ success: true, count: matrix.length, data: matrix });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Configure Tenant WhatsApp Commercial Limits & Toggles
 */
router.put('/tenants/:id/config', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const {
      marketingEnabled,
      whatsappEnabled,
      bulkCampaignsEnabled,
      mediaCampaignsEnabled,
      analyticsEnabled,
      templateManagementEnabled,
      monthlyLimit,
      dailyLimit,
      ratePerMarketingMsg,
      ratePerUtilityMsg,
      platformFeeMarkup
    } = req.body;

    if (!company.features) company.features = {};
    if (!company.features.marketing_config) company.features.marketing_config = {};

    if (marketingEnabled !== undefined) company.features.marketing = Boolean(marketingEnabled);
    if (whatsappEnabled !== undefined) company.features.marketing_config.whatsapp = Boolean(whatsappEnabled);
    if (bulkCampaignsEnabled !== undefined) company.features.marketing_config.bulk_campaigns = Boolean(bulkCampaignsEnabled);
    if (mediaCampaignsEnabled !== undefined) company.features.marketing_config.media_campaigns = Boolean(mediaCampaignsEnabled);
    if (analyticsEnabled !== undefined) company.features.marketing_config.analytics = Boolean(analyticsEnabled);
    if (templateManagementEnabled !== undefined) company.features.marketing_config.template_management = Boolean(templateManagementEnabled);

    if (monthlyLimit !== undefined) company.features.marketing_config.monthly_message_limit = Number(monthlyLimit);
    if (dailyLimit !== undefined) company.features.marketing_config.daily_message_limit = Number(dailyLimit);
    if (ratePerMarketingMsg !== undefined) company.features.marketing_config.rate_per_marketing_msg = Number(ratePerMarketingMsg);
    if (ratePerUtilityMsg !== undefined) company.features.marketing_config.rate_per_utility_msg = Number(ratePerUtilityMsg);
    if (platformFeeMarkup !== undefined) company.features.marketing_config.platform_fee_markup = Number(platformFeeMarkup);

    await company.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'superadmin.whatsapp.config',
      entity: 'Company',
      entityId: company._id,
      details: company.features.marketing_config
    });

    res.json({
      message: `Commercial configuration updated for ${company.name}`,
      features: company.features
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Suspend Tenant WhatsApp Service
 */
router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (!company.features) company.features = {};
    if (!company.features.marketing_config) company.features.marketing_config = {};

    company.features.marketing_config.whatsapp = false;
    await company.save();

    const account = await WhatsAppAccount.findOne({ companyId: company._id });
    if (account) {
      account.connectionStatus = 'DISCONNECTED';
      account.lastError = 'Suspended by Platform Super Administrator';
      await account.save();
    }

    res.json({ message: `WhatsApp service suspended for ${company.name}` });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Reactivate Tenant WhatsApp Service
 */
router.post('/tenants/:id/reactivate', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (!company.features) company.features = {};
    if (!company.features.marketing_config) company.features.marketing_config = {};

    company.features.marketing_config.whatsapp = true;
    await company.save();

    const account = await WhatsAppAccount.findOne({ companyId: company._id });
    if (account) {
      account.connectionStatus = 'CONNECTED';
      account.lastError = null;
      await account.save();
    }

    res.json({ message: `WhatsApp service reactivated for ${company.name}` });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
