const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const MetaAccount = require('../models/MetaAccount');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const SocialPost = require('../models/SocialPost');
const MetaAdCampaign = require('../models/MetaAdCampaign');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const ContentAsset = require('../models/ContentAsset');
const { auth, adminOnly } = require('../middleware/auth');
const logger = require('../services/logger');

// Platform Super Admin Auth Barrier
router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Super Admin access required for Marketing Platform Governance' });
  }
  next();
});

/**
 * Get Platform-Wide Omnichannel Marketing Overview
 */
router.get('/overview', async (req, res) => {
  try {
    const [
      totalCompanies,
      marketingEnabledCount,
      connectedWABACount,
      connectedMetaCount,
      totalSocialPosts,
      totalMetaAds,
      totalWhatsAppCampaigns,
      totalAssets
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ 'features.marketing': true }),
      WhatsAppAccount.countDocuments({ connectionStatus: 'CONNECTED' }),
      MetaAccount.countDocuments({ connectionStatus: 'CONNECTED' }),
      SocialPost.countDocuments(),
      MetaAdCampaign.countDocuments(),
      WhatsAppCampaign.countDocuments(),
      ContentAsset.countDocuments()
    ]);

    const companies = await Company.find()
      .select('name code features.marketing features.marketing_config')
      .sort({ name: 1 });

    res.json({
      metrics: {
        totalCompanies,
        marketingEnabledCount,
        connectedWABACount,
        connectedMetaCount,
        totalSocialPosts,
        totalMetaAds,
        totalWhatsAppCampaigns,
        totalAssets
      },
      companies
    });
  } catch (err) {
    logger.error('Super Admin Marketing Overview Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update Tenant's Commercial Marketing Configuration & Sub-features
 */
router.put('/tenants/:companyId/config', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const {
      marketingMasterEnabled,
      whatsapp,
      bulk_whatsapp,
      social,
      reels,
      meta_ads,
      content_studio,
      calendar,
      ai_marketing,
      approval_workflow,
      monthly_message_limit,
      daily_message_limit,
      monthly_post_limit,
      monthly_ad_spend_limit,
      rate_per_marketing_msg,
      rate_per_utility_msg,
      platform_fee_markup,
      subscription_tier,
      billing_status
    } = req.body;

    // Master switch
    if (typeof marketingMasterEnabled === 'boolean') {
      company.features.marketing = marketingMasterEnabled;
    }

    // Sub-feature toggles
    if (!company.features.marketing_config) {
      company.features.marketing_config = {};
    }

    if (typeof whatsapp === 'boolean') company.features.marketing_config.whatsapp = whatsapp;
    if (typeof bulk_whatsapp === 'boolean') company.features.marketing_config.bulk_whatsapp = bulk_whatsapp;
    if (typeof social === 'boolean') company.features.marketing_config.social = social;
    if (typeof reels === 'boolean') company.features.marketing_config.reels = reels;
    if (typeof meta_ads === 'boolean') company.features.marketing_config.meta_ads = meta_ads;
    if (typeof content_studio === 'boolean') company.features.marketing_config.content_studio = content_studio;
    if (typeof calendar === 'boolean') company.features.marketing_config.calendar = calendar;
    if (typeof ai_marketing === 'boolean') company.features.marketing_config.ai_marketing = ai_marketing;
    if (typeof approval_workflow === 'boolean') company.features.marketing_config.approval_workflow = approval_workflow;

    // Quotas & Rates
    if (monthly_message_limit !== undefined) company.features.marketing_config.monthly_message_limit = Number(monthly_message_limit);
    if (daily_message_limit !== undefined) company.features.marketing_config.daily_message_limit = Number(daily_message_limit);
    if (monthly_post_limit !== undefined) company.features.marketing_config.monthly_post_limit = Number(monthly_post_limit);
    if (monthly_ad_spend_limit !== undefined) company.features.marketing_config.monthly_ad_spend_limit = Number(monthly_ad_spend_limit);
    if (rate_per_marketing_msg !== undefined) company.features.marketing_config.rate_per_marketing_msg = Number(rate_per_marketing_msg);
    if (rate_per_utility_msg !== undefined) company.features.marketing_config.rate_per_utility_msg = Number(rate_per_utility_msg);
    if (platform_fee_markup !== undefined) company.features.marketing_config.platform_fee_markup = Number(platform_fee_markup);
    if (subscription_tier) company.features.marketing_config.subscription_tier = subscription_tier;
    if (billing_status) company.features.marketing_config.billing_status = billing_status;

    company.markModified('features');
    await company.save();

    logger.info(`👑 Super Admin updated marketing commercial entitlements for company: ${company.name} (${company._id})`);

    res.json({
      success: true,
      message: `Commercial marketing configuration updated for ${company.name}`,
      company: {
        id: company._id,
        name: company.name,
        marketingMaster: company.features.marketing,
        marketingConfig: company.features.marketing_config
      }
    });
  } catch (err) {
    logger.error('Super Admin Update Marketing Config Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
