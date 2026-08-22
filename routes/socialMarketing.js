const express = require('express');
const router = express.Router();
const MetaAccount = require('../models/MetaAccount');
const SocialPost = require('../models/SocialPost');
const MetaAdCampaign = require('../models/MetaAdCampaign');
const MarketingHoliday = require('../models/MarketingHoliday');
const MarketingCampaignPlan = require('../models/MarketingCampaignPlan');
const ContentAsset = require('../models/ContentAsset');
const MarketingApproval = require('../models/MarketingApproval');
const MarketingAuditLog = require('../models/MarketingAuditLog');
const Company = require('../models/Company');

const { auth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureGate');
const { requirePermission } = require('../middleware/rbac');
const { encrypt, decrypt, maskSecret } = require('../services/cryptoService');
const {
  getMetaOAuthUrl,
  exchangeCodeForLongLivedToken,
  discoverMetaAssets,
  publishToFacebookPage,
  publishToInstagram,
  createMetaAdCampaign
} = require('../services/metaService');
const { seedDefaultHolidays, generateCampaignPlanFromHoliday } = require('../services/holidayEngineService');
const { generateMarketingCopy, generateMultiChannelVariations } = require('../services/marketingAiService');
const { logMarketingEvent } = require('../services/marketingAuditService');
const logger = require('../services/logger');

// Authenticated & Feature Gated Base
router.use(auth);
router.use((req, res, next) => {
  req.companyId = req.companyId || req.user?.companyId || req.query?.companyId || req.headers['x-company-id'];
  next();
});
router.use(requireFeature('marketing'));

// =========================================================================
// 1. META BUSINESS CONNECTION & ASSET DISCOVERY
// =========================================================================

/**
 * Get Meta OAuth Authorization URL
 */
router.get('/meta/auth-url', requireFeature('marketing.social'), requirePermission('marketing.meta.connect'), (req, res) => {
  const clientId = process.env.META_APP_ID || 'mock_meta_app_id_101';
  const redirectUri = process.env.META_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/marketing/meta/callback`;
  const state = `tenant_${req.companyId}_${Date.now()}`;

  const authUrl = getMetaOAuthUrl(clientId, redirectUri, state);
  res.json({ authUrl, state });
});

/**
 * Handle Meta OAuth Callback or Connect Direct Access Token
 */
router.post('/meta/connect', requireFeature('marketing.social'), requirePermission('marketing.meta.connect'), async (req, res) => {
  try {
    const { code, accessToken } = req.body;
    const clientId = process.env.META_APP_ID || 'mock_app_101';
    const clientSecret = process.env.META_APP_SECRET || 'mock_secret_101';
    const redirectUri = process.env.META_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/marketing/meta/callback`;

    let userToken = accessToken;
    let tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    if (code) {
      const exchange = await exchangeCodeForLongLivedToken(clientId, clientSecret, redirectUri, code);
      userToken = exchange.accessToken;
      if (exchange.expiresIn) {
        tokenExpiresAt = new Date(Date.now() + exchange.expiresIn * 1000);
      }
    }

    if (!userToken) {
      return res.status(400).json({ error: 'Access token or OAuth code is required' });
    }

    // Discover Assets from Meta Graph API
    const assets = await discoverMetaAssets(userToken);

    // Save or update tenant MetaAccount
    let metaAcc = await MetaAccount.findOne({ companyId: req.companyId });
    if (!metaAcc) {
      metaAcc = new MetaAccount({
        companyId: req.companyId,
        connectedBy: req.user.id
      });
    }

    metaAcc.metaBusinessId = assets.business.id;
    metaAcc.businessName = assets.business.name;
    metaAcc.metaUserId = assets.user.id;
    metaAcc.metaUserName = assets.user.name;
    metaAcc.metaUserEmail = assets.user.email;
    metaAcc.encryptedUserAccessToken = encrypt(userToken);
    metaAcc.tokenExpiresAt = tokenExpiresAt;
    metaAcc.connectionStatus = 'CONNECTED';
    metaAcc.healthMessage = 'Healthy connection to Meta Graph API';
    metaAcc.lastHealthCheck = new Date();

    // Map discovered assets
    metaAcc.pages = assets.pages.map(p => ({
      ...p,
      encryptedPageAccessToken: p.pageAccessToken ? encrypt(p.pageAccessToken) : null
    }));
    metaAcc.instagramAccounts = assets.instagramAccounts;
    metaAcc.adAccounts = assets.adAccounts;
    metaAcc.pixels = assets.pixels;

    // Set default selected assets if available
    if (metaAcc.pages.length > 0 && !metaAcc.selectedPageId) {
      metaAcc.selectedPageId = metaAcc.pages[0].pageId;
    }
    if (metaAcc.instagramAccounts.length > 0 && !metaAcc.selectedInstagramId) {
      metaAcc.selectedInstagramId = metaAcc.instagramAccounts[0].igId;
    }
    if (metaAcc.adAccounts.length > 0 && !metaAcc.selectedAdAccountId) {
      metaAcc.selectedAdAccountId = metaAcc.adAccounts[0].adAccountId;
    }
    if (metaAcc.pixels.length > 0 && !metaAcc.selectedPixelId) {
      metaAcc.selectedPixelId = metaAcc.pixels[0].pixelId;
    }

    await metaAcc.save();

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'META_ACCOUNT_CONNECTED',
      channel: 'PLATFORM',
      targetType: 'MetaAccount',
      targetId: metaAcc._id,
      targetTitle: metaAcc.businessName,
      newState: 'CONNECTED'
    });

    res.json({
      success: true,
      message: 'Meta Business account connected and assets discovered successfully!',
      account: {
        businessName: metaAcc.businessName,
        connectionStatus: metaAcc.connectionStatus,
        pagesCount: metaAcc.pages.length,
        instagramCount: metaAcc.instagramAccounts.length,
        adAccountsCount: metaAcc.adAccounts.length,
        pixelsCount: metaAcc.pixels.length,
        selectedPageId: metaAcc.selectedPageId,
        selectedInstagramId: metaAcc.selectedInstagramId,
        selectedAdAccountId: metaAcc.selectedAdAccountId
      }
    });
  } catch (err) {
    logger.error('Meta Connect Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Discovered Meta Assets & Health Status
 */
router.get('/meta/assets', requireFeature('marketing.social'), requirePermission('marketing.view'), async (req, res) => {
  try {
    const metaAcc = await MetaAccount.findOne({ companyId: req.companyId });
    if (!metaAcc) {
      return res.json({ connected: false, account: null });
    }

    res.json({
      connected: metaAcc.connectionStatus === 'CONNECTED',
      account: {
        businessName: metaAcc.businessName,
        userName: metaAcc.metaUserName,
        userEmail: metaAcc.metaUserEmail,
        connectionStatus: metaAcc.connectionStatus,
        healthMessage: metaAcc.healthMessage,
        lastHealthCheck: metaAcc.lastHealthCheck,
        selectedPageId: metaAcc.selectedPageId,
        selectedInstagramId: metaAcc.selectedInstagramId,
        selectedAdAccountId: metaAcc.selectedAdAccountId,
        selectedPixelId: metaAcc.selectedPixelId,
        pages: metaAcc.pages,
        instagramAccounts: metaAcc.instagramAccounts,
        adAccounts: metaAcc.adAccounts,
        pixels: metaAcc.pixels
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Select Active Page / Instagram / Ad Account
 */
router.put('/meta/select-assets', requireFeature('marketing.social'), requirePermission('marketing.meta.manage'), async (req, res) => {
  try {
    const { pageId, instagramId, adAccountId, pixelId } = req.body;
    const metaAcc = await MetaAccount.findOne({ companyId: req.companyId });
    if (!metaAcc) {
      return res.status(404).json({ error: 'No Meta Account found' });
    }

    if (pageId) metaAcc.selectedPageId = pageId;
    if (instagramId) metaAcc.selectedInstagramId = instagramId;
    if (adAccountId) metaAcc.selectedAdAccountId = adAccountId;
    if (pixelId) metaAcc.selectedPixelId = pixelId;

    await metaAcc.save();
    res.json({ success: true, message: 'Active Meta assets updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Disconnect Meta Account
 */
router.post('/meta/disconnect', requireFeature('marketing.social'), requirePermission('marketing.meta.manage'), async (req, res) => {
  try {
    await MetaAccount.deleteOne({ companyId: req.companyId });
    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'META_ACCOUNT_DISCONNECTED',
      channel: 'PLATFORM'
    });
    res.json({ success: true, message: 'Meta Account disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. SOCIAL POSTS & REELS (ORGANIC)
// =========================================================================

/**
 * List Social Posts & Reels with filters
 */
router.get('/posts', requireFeature('marketing.social'), requirePermission('marketing.social.view'), async (req, res) => {
  try {
    const { status, postType, platform } = req.query;
    const filter = { companyId: req.companyId };

    if (status) filter.status = status;
    if (postType) filter.postType = postType;
    if (platform) filter.platforms = platform;

    const posts = await SocialPost.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.json({ count: posts.length, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create Social Post or Reel (Draft, Scheduled, or Immediate)
 */
router.post('/posts', requireFeature('marketing.social'), requirePermission('marketing.social.create'), async (req, res) => {
  try {
    const {
      title,
      postType = 'POST',
      platforms = ['INSTAGRAM', 'FACEBOOK'],
      caption,
      hashtags = [],
      mediaUrls = [],
      coverImageUrl = null,
      location = null,
      scheduledAt = null,
      holidayId = null,
      campaignPlanId = null
    } = req.body;

    if (!caption) {
      return res.status(400).json({ error: 'Post caption is required' });
    }

    const company = await Company.findById(req.companyId);
    const requiresApproval = company?.features?.marketing_config?.approval_workflow && !['super-admin', 'company-admin', 'marketing-director', 'marketing-manager'].includes(req.user.role);

    const initialStatus = requiresApproval ? 'PENDING_APPROVAL' : (scheduledAt ? 'SCHEDULED' : 'DRAFT');

    const post = await SocialPost.create({
      companyId: req.companyId,
      title: title || `${postType} - ${new Date().toLocaleDateString()}`,
      postType,
      platforms,
      caption,
      hashtags,
      mediaUrls,
      coverImageUrl,
      location,
      status: initialStatus,
      requiresApproval,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      holidayId,
      campaignPlanId,
      createdBy: req.user.id
    });

    if (requiresApproval) {
      const approval = await MarketingApproval.create({
        companyId: req.companyId,
        itemType: postType === 'REEL' ? 'SOCIAL_REEL' : 'SOCIAL_POST',
        itemId: post._id,
        itemTitle: post.title,
        requestedBy: req.user.id,
        itemSnapshot: { caption, postType, platforms, mediaUrls }
      });
      post.approvalId = approval._id;
      await post.save();
    }

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: postType === 'REEL' ? 'REEL_CREATED' : 'POST_CREATED',
      channel: platforms.includes('INSTAGRAM') ? 'INSTAGRAM' : 'FACEBOOK',
      targetType: 'SocialPost',
      targetId: post._id,
      targetTitle: post.title,
      newState: post.status
    });

    res.status(201).json({
      success: true,
      message: requiresApproval ? 'Post submitted for Manager approval' : (scheduledAt ? 'Post scheduled successfully' : 'Draft created'),
      post
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Direct Publish Social Post or Reel to Facebook/Instagram
 */
router.post('/posts/:id/publish', requireFeature('marketing.social'), requirePermission('marketing.social.publish'), async (req, res) => {
  try {
    const post = await SocialPost.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const metaAcc = await MetaAccount.findOne({ companyId: req.companyId }).select('+encryptedUserAccessToken');
    if (!metaAcc || metaAcc.connectionStatus !== 'CONNECTED') {
      return res.status(400).json({ error: 'No active connected Meta Account found for tenant' });
    }

    post.status = 'PUBLISHING';
    await post.save();

    const externalIds = {};

    // 1. Publish to Facebook Page
    if (post.platforms.includes('FACEBOOK') && metaAcc.selectedPageId) {
      const fbRes = await publishToFacebookPage(metaAcc.selectedPageId, 'mock_page_token', {
        caption: post.caption,
        mediaUrls: post.mediaUrls
      });
      externalIds.facebookPostId = fbRes.postId;
    }

    // 2. Publish to Instagram
    if (post.platforms.includes('INSTAGRAM') && metaAcc.selectedInstagramId) {
      const igRes = await publishToInstagram(metaAcc.selectedInstagramId, 'mock_user_token', {
        caption: post.caption,
        mediaUrls: post.mediaUrls,
        postType: post.postType,
        coverImageUrl: post.coverImageUrl
      });
      externalIds.instagramMediaId = igRes.mediaId;
    }

    post.status = 'PUBLISHED';
    post.publishedAt = new Date();
    post.externalMetaIds = externalIds;
    await post.save();

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: post.postType === 'REEL' ? 'REEL_PUBLISHED' : 'POST_PUBLISHED',
      channel: post.platforms.includes('INSTAGRAM') ? 'INSTAGRAM' : 'FACEBOOK',
      targetType: 'SocialPost',
      targetId: post._id,
      targetTitle: post.title,
      newState: 'PUBLISHED',
      externalId: externalIds.facebookPostId || externalIds.instagramMediaId
    });

    res.json({
      success: true,
      message: `${post.postType} published successfully!`,
      post
    });
  } catch (err) {
    logger.error('Direct Publish Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Boost Published Post/Reel (Convert to Paid Meta Ad)
 */
router.post('/posts/:id/boost', requireFeature('marketing.meta_ads'), requirePermission('marketing.ads.create'), async (req, res) => {
  try {
    const post = await SocialPost.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const {
      dailyBudget = 500,
      durationDays = 7,
      objective = 'OUTCOME_ENGAGEMENT',
      targetAudience = 'Homeowners 25-55 in target cities'
    } = req.body;

    const metaAcc = await MetaAccount.findOne({ companyId: req.companyId });
    if (!metaAcc || !metaAcc.selectedAdAccountId) {
      return res.status(400).json({ error: 'No active Ad Account connected for tenant' });
    }

    const company = await Company.findById(req.companyId);
    const requiresApproval = company?.features?.marketing_config?.approval_workflow && !['super-admin', 'company-admin', 'marketing-director', 'marketing-manager'].includes(req.user.role);

    const totalBudget = dailyBudget * durationDays;
    const adCampaign = await MetaAdCampaign.create({
      companyId: req.companyId,
      name: `Boost: ${post.title}`,
      objective,
      adAccountId: metaAcc.selectedAdAccountId,
      pixelId: metaAcc.selectedPixelId,
      campaignType: post.postType === 'REEL' ? 'BOOST_REEL' : 'BOOST_POST',
      boostedPostId: post._id,
      budgetType: 'DAILY',
      budgetAmount: dailyBudget,
      startDate: new Date(),
      endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      adSets: [{
        name: `AdSet - Boost ${post.title}`,
        dailyBudget,
        targeting: { locations: ['India'], minAge: 21, maxAge: 60, genders: ['ALL'], interests: ['Home Improvement', 'Appliances'] },
        placements: { facebookFeed: true, instagramFeed: true, instagramReels: true, facebookReels: true, instagramStories: true, audienceNetwork: false }
      }],
      creatives: [{
        name: `Creative - ${post.title}`,
        headline: post.title,
        primaryText: post.caption,
        callToAction: 'LEARN_MORE',
        sourcePostId: post._id
      }],
      status: requiresApproval ? 'PENDING_APPROVAL' : 'ACTIVE',
      requiresApproval,
      createdBy: req.user.id
    });

    if (requiresApproval) {
      const approval = await MarketingApproval.create({
        companyId: req.companyId,
        itemType: 'META_AD_CAMPAIGN',
        itemId: adCampaign._id,
        itemTitle: adCampaign.name,
        estimatedBudget: totalBudget,
        requestedBy: req.user.id,
        itemSnapshot: { postTitle: post.title, dailyBudget, durationDays, totalBudget }
      });
      adCampaign.approvalId = approval._id;
      await adCampaign.save();
    }

    post.isBoosted = true;
    post.boostAdCampaignId = adCampaign._id;
    await post.save();

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'POST_BOOSTED',
      channel: 'META_ADS',
      targetType: 'MetaAdCampaign',
      targetId: adCampaign._id,
      targetTitle: adCampaign.name,
      budget: totalBudget,
      newState: adCampaign.status
    });

    res.json({
      success: true,
      message: requiresApproval ? 'Boost promotion submitted for budget approval' : 'Boost campaign launched successfully!',
      adCampaign
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. META ADS MANAGER
// =========================================================================

/**
 * List Meta Ad Campaigns & Insights
 */
router.get('/ads/campaigns', requireFeature('marketing.meta_ads'), requirePermission('marketing.ads.view'), async (req, res) => {
  try {
    const campaigns = await MetaAdCampaign.find({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('boostedPostId', 'title postType caption coverImageUrl');

    res.json({ count: campaigns.length, campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create Meta Ad Campaign
 */
router.post('/ads/campaigns', requireFeature('marketing.meta_ads'), requirePermission('marketing.ads.create'), async (req, res) => {
  try {
    const {
      name,
      objective = 'OUTCOME_LEADS',
      budgetType = 'DAILY',
      budgetAmount,
      startDate = new Date(),
      endDate = null,
      adSets = [],
      creatives = []
    } = req.body;

    if (!name || !budgetAmount) {
      return res.status(400).json({ error: 'Campaign name and budget are required' });
    }

    const metaAcc = await MetaAccount.findOne({ companyId: req.companyId });
    if (!metaAcc || !metaAcc.selectedAdAccountId) {
      return res.status(400).json({ error: 'No active Ad Account connected' });
    }

    const company = await Company.findById(req.companyId);
    const requiresApproval = company?.features?.marketing_config?.approval_workflow && !['super-admin', 'company-admin', 'marketing-director', 'marketing-manager'].includes(req.user.role);

    const campaign = await MetaAdCampaign.create({
      companyId: req.companyId,
      name,
      objective,
      adAccountId: metaAcc.selectedAdAccountId,
      pixelId: metaAcc.selectedPixelId,
      budgetType,
      budgetAmount,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      adSets: adSets.length > 0 ? adSets : [{
        name: `${name} - Target Group`,
        dailyBudget: budgetAmount,
        targeting: { locations: ['India'], minAge: 22, maxAge: 60, genders: ['ALL'] }
      }],
      creatives,
      status: requiresApproval ? 'PENDING_APPROVAL' : 'ACTIVE',
      requiresApproval,
      createdBy: req.user.id
    });

    if (requiresApproval) {
      const approval = await MarketingApproval.create({
        companyId: req.companyId,
        itemType: 'META_AD_CAMPAIGN',
        itemId: campaign._id,
        itemTitle: campaign.name,
        estimatedBudget: budgetAmount * 7,
        requestedBy: req.user.id,
        itemSnapshot: { name, objective, budgetAmount, budgetType }
      });
      campaign.approvalId = approval._id;
      await campaign.save();
    }

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'META_AD_CAMPAIGN_CREATED',
      channel: 'META_ADS',
      targetType: 'MetaAdCampaign',
      targetId: campaign._id,
      targetTitle: campaign.name,
      budget: budgetAmount,
      newState: campaign.status
    });

    res.status(201).json({
      success: true,
      message: requiresApproval ? 'Ad campaign submitted for budget approval' : 'Ad campaign launched successfully',
      campaign
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 4. CONTENT STUDIO & ASSET LIBRARY
// =========================================================================

/**
 * List Content Assets with filters
 */
router.get('/content/assets', requireFeature('marketing.content_studio'), requirePermission('marketing.content.view'), async (req, res) => {
  try {
    const { assetType, category, search } = req.query;
    const filter = { companyId: req.companyId };

    if (assetType) filter.assetType = assetType;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const assets = await ContentAsset.find(filter).sort({ createdAt: -1 });
    res.json({ count: assets.length, assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Upload Asset into Content Library
 */
router.post('/content/assets', requireFeature('marketing.content_studio'), requirePermission('marketing.content.upload'), async (req, res) => {
  try {
    const {
      title,
      assetType = 'IMAGE',
      url,
      thumbnailUrl = null,
      fileSize = 0,
      mimeType = 'image/jpeg',
      productName = null,
      brandName = null,
      category = 'Product Creatives',
      campaignTag = null,
      tags = []
    } = req.body;

    if (!title || !url) {
      return res.status(400).json({ error: 'Asset title and URL are required' });
    }

    const asset = await ContentAsset.create({
      companyId: req.companyId,
      title,
      assetType,
      url,
      thumbnailUrl: thumbnailUrl || url,
      fileSize,
      mimeType,
      productName,
      brandName,
      category,
      campaignTag,
      tags,
      uploadedBy: req.user.id
    });

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'CONTENT_ASSET_UPLOADED',
      channel: 'CONTENT_STUDIO',
      targetType: 'ContentAsset',
      targetId: asset._id,
      targetTitle: asset.title
    });

    res.status(201).json({ success: true, asset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete Asset from Library
 */
router.delete('/content/assets/:id', requireFeature('marketing.content_studio'), requirePermission('marketing.content.manage'), async (req, res) => {
  try {
    await ContentAsset.deleteOne({ _id: req.params.id, companyId: req.companyId });
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 5. MARKETING CALENDAR & HOLIDAY ENGINE
// =========================================================================

/**
 * List Master Holidays with Campaign Blueprints
 */
router.get('/calendar/holidays', requireFeature('marketing.calendar'), requirePermission('marketing.calendar.view'), async (req, res) => {
  try {
    await seedDefaultHolidays();
    const holidays = await MarketingHoliday.find({
      $or: [{ isGlobalMaster: true }, { customCompanyId: req.companyId }]
    }).sort({ month: 1, day: 1 });

    res.json({ count: holidays.length, holidays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Unified Marketing Calendar Events (Holidays, Posts, WhatsApp, Meta Ads)
 */
router.get('/calendar/events', requireFeature('marketing.calendar'), requirePermission('marketing.calendar.view'), async (req, res) => {
  try {
    await seedDefaultHolidays();
    const { start, end } = req.query;

    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const [holidays, posts, adCampaigns, campaignPlans] = await Promise.all([
      MarketingHoliday.find({ $or: [{ isGlobalMaster: true }, { customCompanyId: req.companyId }] }),
      SocialPost.find({ companyId: req.companyId, $or: [{ scheduledAt: { $gte: startDate, $lte: endDate } }, { publishedAt: { $gte: startDate, $lte: endDate } }] }),
      MetaAdCampaign.find({ companyId: req.companyId, startDate: { $gte: startDate, $lte: endDate } }),
      MarketingCampaignPlan.find({ companyId: req.companyId, startDate: { $gte: startDate, $lte: endDate } })
    ]);

    const events = [];

    // Map Holidays
    const currentYear = new Date().getFullYear();
    holidays.forEach(h => {
      events.push({
        id: `holiday_${h._id}`,
        title: `🪔 ${h.name}`,
        date: new Date(currentYear, h.month - 1, h.day),
        type: 'HOLIDAY',
        category: h.category,
        businessRelevance: h.businessRelevance,
        holidayId: h._id,
        suggestedChannels: h.suggestedChannels
      });
    });

    // Map Social Posts
    posts.forEach(p => {
      events.push({
        id: `post_${p._id}`,
        title: `${p.postType === 'REEL' ? '🎬' : '📱'} ${p.title}`,
        date: p.scheduledAt || p.publishedAt || p.createdAt,
        type: p.postType,
        channel: p.platforms.join(', '),
        status: p.status,
        postId: p._id
      });
    });

    // Map Meta Ads
    adCampaigns.forEach(ad => {
      events.push({
        id: `ad_${ad._id}`,
        title: `🎯 ${ad.name}`,
        date: ad.startDate,
        type: 'META_AD',
        status: ad.status,
        budget: ad.budgetAmount,
        adCampaignId: ad._id
      });
    });

    res.json({ count: events.length, events, campaignPlans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 1-Click Generate Omnichannel Campaign Plan from Holiday
 */
router.post('/calendar/generate-campaign', requireFeature('marketing.calendar'), requirePermission('marketing.calendar.manage'), async (req, res) => {
  try {
    const { holidayId, title, objective, totalBudget } = req.body;
    if (!holidayId) {
      return res.status(400).json({ error: 'holidayId is required' });
    }

    const plan = await generateCampaignPlanFromHoliday(req.companyId, holidayId, req.user.id, {
      title,
      objective,
      totalBudget
    });

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'CAMPAIGN_PLAN_GENERATED',
      channel: 'CALENDAR',
      targetType: 'MarketingCampaignPlan',
      targetId: plan._id,
      targetTitle: plan.title,
      budget: totalBudget
    });

    res.status(201).json({
      success: true,
      message: `Omnichannel campaign roadmap created with ${plan.milestones.length} multi-channel milestones!`,
      plan
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 6. CHARLIE AI MARKETING ASSISTANT
// =========================================================================

/**
 * Generate AI Caption & Hashtags
 */
router.post('/ai/generate-copy', requireFeature('marketing.ai_marketing'), requirePermission('marketing.ai.generate'), (req, res) => {
  try {
    const result = generateMarketingCopy(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate Omnichannel Multi-Format Copy Variations
 */
router.post('/ai/multi-channel', requireFeature('marketing.ai_marketing'), requirePermission('marketing.ai.generate'), (req, res) => {
  try {
    const { topic, productName, offerDetails, holiday } = req.body;
    const variations = generateMultiChannelVariations(topic, productName, offerDetails, holiday);
    res.json({ success: true, variations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 7. MAKER-CHECKER APPROVAL WORKFLOW
// =========================================================================

/**
 * List Pending Marketing Approvals
 */
router.get('/approvals/pending', requireFeature('marketing.approval_workflow'), requirePermission('marketing.approval.request'), async (req, res) => {
  try {
    const approvals = await MarketingApproval.find({
      companyId: req.companyId,
      status: 'PENDING'
    }).sort({ requestedAt: -1 }).populate('requestedBy', 'name email role');

    res.json({ count: approvals.length, approvals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Approve Submission (Social Post, Reel, or Paid Meta Ad)
 */
router.post('/approvals/:id/approve', requireFeature('marketing.approval_workflow'), requirePermission('marketing.approval.approve'), async (req, res) => {
  try {
    const approval = await MarketingApproval.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!approval || approval.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval record not found' });
    }

    approval.status = 'APPROVED';
    approval.reviewerId = req.user.id;
    approval.reviewedAt = new Date();
    approval.reviewerNotes = req.body.notes || 'Approved for launch';
    await approval.save();

    // Update underlying item state
    if (['SOCIAL_POST', 'SOCIAL_REEL'].includes(approval.itemType)) {
      const post = await SocialPost.findById(approval.itemId);
      if (post) {
        post.status = post.scheduledAt ? 'SCHEDULED' : 'APPROVED';
        await post.save();
      }
    } else if (approval.itemType === 'META_AD_CAMPAIGN') {
      const ad = await MetaAdCampaign.findById(approval.itemId);
      if (ad) {
        ad.status = 'ACTIVE';
        await ad.save();
      }
    }

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'APPROVAL_GRANTED',
      channel: 'PLATFORM',
      targetType: approval.itemType,
      targetId: approval.itemId,
      targetTitle: approval.itemTitle,
      newState: 'APPROVED'
    });

    res.json({ success: true, message: `Approved ${approval.itemTitle} for publication!`, approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reject Submission with feedback
 */
router.post('/approvals/:id/reject', requireFeature('marketing.approval_workflow'), requirePermission('marketing.approval.reject'), async (req, res) => {
  try {
    const approval = await MarketingApproval.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!approval || approval.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval record not found' });
    }

    approval.status = 'REJECTED';
    approval.reviewerId = req.user.id;
    approval.reviewedAt = new Date();
    approval.rejectionReason = req.body.reason || 'Revisions requested';
    await approval.save();

    if (['SOCIAL_POST', 'SOCIAL_REEL'].includes(approval.itemType)) {
      const post = await SocialPost.findById(approval.itemId);
      if (post) {
        post.status = 'REJECTED';
        post.errorMessage = approval.rejectionReason;
        await post.save();
      }
    } else if (approval.itemType === 'META_AD_CAMPAIGN') {
      const ad = await MetaAdCampaign.findById(approval.itemId);
      if (ad) {
        ad.status = 'REJECTED';
        await ad.save();
      }
    }

    await logMarketingEvent({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'APPROVAL_REJECTED',
      channel: 'PLATFORM',
      targetType: approval.itemType,
      targetId: approval.itemId,
      targetTitle: approval.itemTitle,
      newState: 'REJECTED'
    });

    res.json({ success: true, message: 'Submission rejected with feedback', approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 8. AUDIT LOGS
// =========================================================================

/**
 * View Marketing Audit Logs
 */
router.get('/audit-logs', requirePermission('marketing.view'), async (req, res) => {
  try {
    const logs = await MarketingAuditLog.find({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 9. META ADS PREFLIGHT WIZARD
// =========================================================================

/**
 * Meta Ads Preflight Validator
 */
router.post('/ads/preflight', requireFeature('marketing.meta_ads'), requirePermission('marketing.ads.create'), async (req, res) => {
  try {
    const { analyzeMetaAdPreflight } = require('../services/campaignPreflightService');
    const preflight = await analyzeMetaAdPreflight(req.companyId, req.body);
    res.json({ success: true, preflight });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 10. CLOSED-LOOP CRM AUDIENCE SEGMENTATION
// =========================================================================

const MarketingSegment = require('../models/MarketingSegment');
const { resolveSegmentContacts, saveAndCalculateSegment } = require('../services/marketingSegmentService');

/**
 * List CRM Marketing Segments
 */
router.get('/segments', requirePermission('marketing.view'), async (req, res) => {
  try {
    const segments = await MarketingSegment.find({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    res.json({ count: segments.length, segments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create Dynamic CRM Segment
 */
router.post('/segments', requirePermission('marketing.campaign.create'), async (req, res) => {
  try {
    const result = await saveAndCalculateSegment(req.companyId, req.body, req.user.id);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Resolve Segment Contacts for Campaign Dispatch
 */
router.get('/segments/:id/contacts', requirePermission('marketing.campaign.create'), async (req, res) => {
  try {
    const segment = await MarketingSegment.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!segment) return res.status(404).json({ error: 'Segment not found' });

    const contacts = await resolveSegmentContacts(req.companyId, segment.filterCriteria, segment.targetEntity);
    res.json({ count: contacts.length, contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 11. EXTERNAL THIRD-PARTY INTEGRATION DIAGNOSTICS
// =========================================================================

const { runIntegrationDiagnostics } = require('../services/metaDiagnosticService');

/**
 * Run Live Meta & WhatsApp API Health Diagnostics
 */
router.get('/diagnostics/health', requirePermission('marketing.view'), async (req, res) => {
  try {
    const diagnostics = await runIntegrationDiagnostics(req.companyId);
    res.json({ success: true, diagnostics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
