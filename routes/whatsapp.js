const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireFeature } = require('../middleware/featureGate');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const WhatsAppContact = require('../models/WhatsAppContact');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppCampaignRecipient = require('../models/WhatsAppCampaignRecipient');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppUsage = require('../models/WhatsAppUsage');
const WhatsAppWallet = require('../models/WhatsAppWallet');
const { encrypt, decrypt, maskSecret } = require('../services/cryptoService');
const { testConnection, syncTemplates, uploadMedia, sendTemplateMessage } = require('../services/whatsAppService');
const { importContactsFromCSV, normalizePhone } = require('../services/whatsAppContactService');
const { estimateCampaignCost, getOrCreateWallet, validateCampaignBudget, creditWallet, getRateCard } = require('../services/whatsAppBillingService');
const { launchCampaign, pauseCampaign, resumeCampaign, cancelCampaign } = require('../services/whatsAppQueueService');
const { verifyWebhookSignature, processWebhookPayload } = require('../services/whatsAppWebhookService');
const { recordAuditEvent } = require('../services/auditService');
const logger = require('../services/logger');

const router = express.Router();

// File upload setup for media & CSV imports
const uploadDir = path.join(__dirname, '..', 'uploads', 'whatsapp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max (supports video)
});

// =========================================================================
// 1. PUBLIC / WEBHOOK ENDPOINTS
// =========================================================================

/**
 * Meta Webhook verification handshake
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'charlie_crm_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('✅ WhatsApp Webhook verified successfully by Meta');
    return res.status(200).send(challenge);
  }

  logger.warn('⚠️ Meta Webhook verification token mismatch');
  return res.sendStatus(403);
});

/**
 * Meta Webhook event receiver
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const appSecret = process.env.META_APP_SECRET;

    // Handle parsed or raw body
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    await processWebhookPayload(body);

    res.status(200).json({ status: 'EVENT_RECEIVED' });
  } catch (err) {
    logger.error('WhatsApp Webhook processing error:', err);
    res.status(200).json({ status: 'ERROR_RECORDED' }); // Always return 200 to Meta to prevent retry loops
  }
});

// =========================================================================
// AUTHENTICATED & FEATURE-GATED TENANT ENDPOINTS
// =========================================================================
router.use(auth);
router.use((req, res, next) => {
  req.companyId = req.companyId || req.user?.companyId || req.query?.companyId || req.headers['x-company-id'];
  next();
});
router.use(requireFeature('marketing'));

// =========================================================================
// 2. WHATSAPP ACCOUNT MANAGEMENT
// =========================================================================

/**
 * Get connected WhatsApp account for the company (Masked tokens)
 */
router.get('/account', requirePermission('marketing.view'), async (req, res) => {
  try {
    const account = await WhatsAppAccount.findOne({ companyId: req.companyId })
      .select('+encryptedAccessToken');

    if (!account) {
      return res.json({ connected: false, account: null });
    }

    const rawToken = decrypt(account.encryptedAccessToken);
    res.json({
      connected: account.connectionStatus === 'CONNECTED',
      account: {
        id: account._id,
        wabaId: account.wabaId,
        phoneNumberId: account.phoneNumberId,
        displayPhoneNumber: account.displayPhoneNumber,
        verifiedName: account.verifiedName,
        businessPortfolioId: account.businessPortfolioId,
        maskedToken: maskSecret(rawToken),
        connectionStatus: account.connectionStatus,
        qualityRating: account.qualityRating,
        messagingLimit: account.messagingLimit,
        lastTestedAt: account.lastTestedAt,
        lastSyncAt: account.lastSyncAt,
        lastError: account.lastError
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Connect / Update WhatsApp Business Account
 */
router.post('/account', requirePermission('marketing.whatsapp.manage'), async (req, res) => {
  try {
    const { wabaId, phoneNumberId, accessToken, businessPortfolioId, displayPhoneNumber } = req.body;

    if (!wabaId || !phoneNumberId || !accessToken) {
      return res.status(400).json({ message: 'wabaId, phoneNumberId, and accessToken are required' });
    }

    // Test connection first
    const testRes = await testConnection(wabaId, phoneNumberId, accessToken);
    if (!testRes.success) {
      return res.status(400).json({
        message: `Connection test failed: ${testRes.error}`,
        code: 'META_CONNECTION_FAILED'
      });
    }

    const encryptedAccessToken = encrypt(accessToken);

    let account = await WhatsAppAccount.findOne({ companyId: req.companyId });
    if (account) {
      account.wabaId = wabaId;
      account.phoneNumberId = phoneNumberId;
      account.encryptedAccessToken = encryptedAccessToken;
      account.businessPortfolioId = businessPortfolioId || account.businessPortfolioId;
      account.displayPhoneNumber = testRes.displayPhoneNumber || displayPhoneNumber || account.displayPhoneNumber;
      account.verifiedName = testRes.verifiedName || account.verifiedName;
      account.connectionStatus = 'CONNECTED';
      account.qualityRating = testRes.qualityRating || 'GREEN';
      account.messagingLimit = testRes.messagingLimit || 'TIER_1K';
      account.lastTestedAt = new Date();
      account.lastError = null;
      await account.save();
    } else {
      account = new WhatsAppAccount({
        companyId: req.companyId,
        wabaId,
        phoneNumberId,
        encryptedAccessToken,
        businessPortfolioId,
        displayPhoneNumber: testRes.displayPhoneNumber || displayPhoneNumber,
        verifiedName: testRes.verifiedName,
        connectionStatus: 'CONNECTED',
        qualityRating: testRes.qualityRating || 'GREEN',
        messagingLimit: testRes.messagingLimit || 'TIER_1K',
        lastTestedAt: new Date()
      });
      await account.save();
    }

    // Auto-sync templates on successful connect
    try {
      await syncTemplates(req.companyId);
    } catch (e) {
      logger.warn('Initial template auto-sync notice:', e.message);
    }

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'whatsapp.account.connect',
      entity: 'WhatsAppAccount',
      entityId: account._id,
      details: { wabaId, phoneNumberId, verifiedName: testRes.verifiedName }
    });

    res.json({
      message: 'WhatsApp Business Account connected successfully',
      account: {
        wabaId: account.wabaId,
        phoneNumberId: account.phoneNumberId,
        displayPhoneNumber: account.displayPhoneNumber,
        verifiedName: account.verifiedName,
        connectionStatus: account.connectionStatus,
        qualityRating: account.qualityRating,
        messagingLimit: account.messagingLimit
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Test WhatsApp Connection
 */
router.post('/account/test', requirePermission('marketing.whatsapp.manage'), async (req, res) => {
  try {
    const account = await WhatsAppAccount.findOne({ companyId: req.companyId })
      .select('+encryptedAccessToken');

    if (!account) {
      return res.status(404).json({ message: 'No WhatsApp Account connected' });
    }

    const token = decrypt(account.encryptedAccessToken);
    const testResult = await testConnection(account.wabaId, account.phoneNumberId, token);

    account.lastTestedAt = new Date();
    account.connectionStatus = testResult.success ? 'CONNECTED' : 'ERROR';
    account.lastError = testResult.success ? null : testResult.error;
    if (testResult.success) {
      account.verifiedName = testResult.verifiedName || account.verifiedName;
      account.qualityRating = testResult.qualityRating || account.qualityRating;
      account.messagingLimit = testResult.messagingLimit || account.messagingLimit;
    }
    await account.save();

    res.json(testResult);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================================================================
// 3. TEMPLATES
// =========================================================================

/**
 * List Synced Templates
 */
router.get('/templates', requirePermission('marketing.templates.view'), async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = { companyId: req.companyId };

    if (category) query.category = category.toUpperCase();
    if (status) query.status = status.toUpperCase();
    if (search) query.name = { $regex: search, $options: 'i' };

    const templates = await WhatsAppTemplate.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: templates.length, data: templates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Sync templates from Meta
 */
router.post('/templates/sync', requirePermission('marketing.templates.manage'), async (req, res) => {
  try {
    const result = await syncTemplates(req.companyId);
    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'whatsapp.templates.sync',
      entity: 'WhatsAppTemplate',
      details: { syncedCount: result.syncedCount }
    });
    res.json({ message: `Synced ${result.syncedCount} templates successfully`, ...result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// =========================================================================
// 4. CONTACTS & AUDIENCES
// =========================================================================

/**
 * List Contacts
 */
router.get('/contacts', requirePermission('marketing.contacts.view'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, customerType, optIn, status } = req.query;
    const query = { companyId: req.companyId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    if (customerType) query.customerType = customerType.toUpperCase();
    if (status) query.status = status.toUpperCase();
    if (optIn !== undefined) query.whatsappOptIn = optIn === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [contacts, total] = await Promise.all([
      WhatsAppContact.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      WhatsAppContact.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Import Contacts via CSV upload
 */
router.post('/contacts/import', requirePermission('marketing.contacts.import'), upload.single('file'), async (req, res) => {
  try {
    let csvContent = '';
    if (req.file) {
      csvContent = fs.readFileSync(req.file.path, 'utf8');
      fs.unlinkSync(req.file.path); // Clean temp upload
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({ message: 'CSV file or csvText is required' });
    }

    const defaultOptIn = req.body.defaultOptIn !== 'false';
    const importResult = await importContactsFromCSV(req.companyId, csvContent, {
      source: 'CSV_IMPORT',
      defaultOptIn
    });

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'whatsapp.contacts.import',
      entity: 'WhatsAppContact',
      details: importResult.stats
    });

    res.json({
      message: `Import completed: ${importResult.stats.imported} new, ${importResult.stats.existing} updated, ${importResult.stats.invalid} invalid, ${importResult.stats.duplicate} duplicates`,
      ...importResult
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Audience Segments Summary
 */
router.get('/audiences', requirePermission('marketing.view'), async (req, res) => {
  try {
    const [totalContacts, validOptIn, dealers, maharashtra, customers] = await Promise.all([
      WhatsAppContact.countDocuments({ companyId: req.companyId }),
      WhatsAppContact.countDocuments({ companyId: req.companyId, status: 'VALID', whatsappOptIn: true, whatsappOptOut: false }),
      WhatsAppContact.countDocuments({ companyId: req.companyId, customerType: 'DEALER', status: 'VALID', whatsappOptIn: true }),
      WhatsAppContact.countDocuments({ companyId: req.companyId, state: { $regex: 'Maharashtra', $options: 'i' }, status: 'VALID', whatsappOptIn: true }),
      WhatsAppContact.countDocuments({ companyId: req.companyId, customerType: 'CUSTOMER', status: 'VALID', whatsappOptIn: true })
    ]);

    const segments = [
      { id: 'ALL_VALID', name: 'All Eligible Contacts (Opted-in)', count: validOptIn, criteria: { optIn: true } },
      { id: 'CUSTOMERS', name: 'Verified Retail Customers', count: customers, criteria: { customerType: 'CUSTOMER' } },
      { id: 'DEALERS', name: 'Authorized Dealers', count: dealers, criteria: { customerType: 'DEALER' } },
      { id: 'MAHARASHTRA', name: 'Maharashtra Regional Audience', count: maharashtra, criteria: { state: 'Maharashtra' } }
    ];

    res.json({
      totalContacts,
      eligibleTotal: validOptIn,
      segments
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================================================================
// 5. MEDIA LIBRARY
// =========================================================================

/**
 * List Media Files
 */
router.get('/media', requirePermission('marketing.view'), async (req, res) => {
  try {
    const media = await WhatsAppMedia.find({ companyId: req.companyId }).sort({ createdAt: -1 });
    res.json({ success: true, count: media.length, data: media });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Upload Media & Sync to WhatsApp Cloud API
 */
router.post('/media/upload', requirePermission('marketing.campaign.create'), upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Media file is required' });
    }

    const { mimetype, originalname, size, path: filePath, filename } = req.file;

    // Validate MIME types
    let fileType = 'DOCUMENT';
    if (mimetype.startsWith('image/')) fileType = 'IMAGE';
    else if (mimetype.startsWith('video/')) fileType = 'VIDEO';
    else if (mimetype.startsWith('audio/')) fileType = 'AUDIO';

    // Upload to Meta Cloud API if account is connected
    let whatsappMediaId = null;
    let whatsappMediaIdExpiresAt = null;

    try {
      const metaMedia = await uploadMedia(req.companyId, filePath, mimetype);
      whatsappMediaId = metaMedia.whatsappMediaId;
      whatsappMediaIdExpiresAt = metaMedia.expiresAt;
    } catch (e) {
      logger.warn('Meta media sync deferred:', e.message);
    }

    const storageUrl = `/uploads/whatsapp/${filename}`;

    const mediaDoc = new WhatsAppMedia({
      companyId: req.companyId,
      fileName: filename,
      originalName: originalname,
      fileType,
      mimeType: mimetype,
      fileSize: size,
      localPath: filePath,
      storageUrl,
      whatsappMediaId,
      whatsappMediaIdExpiresAt,
      uploadedBy: req.user.id
    });
    await mediaDoc.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'whatsapp.media.upload',
      entity: 'WhatsAppMedia',
      entityId: mediaDoc._id,
      details: { fileName: filename, mimeType: mimetype, size }
    });

    res.status(201).json({
      message: 'Media uploaded successfully',
      data: mediaDoc
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// =========================================================================
// 6. CAMPAIGN BUILDER & QUEUE
// =========================================================================

/**
 * List Campaigns
 */
router.get('/campaigns', requirePermission('marketing.campaign.view'), async (req, res) => {
  try {
    const campaigns = await WhatsAppCampaign.find({ companyId: req.companyId })
      .populate('templateId', 'name category language bodyText headerType')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get Campaign Details & Live Recipient Stats
 */
router.get('/campaigns/:id', requirePermission('marketing.campaign.view'), async (req, res) => {
  try {
    const campaign = await WhatsAppCampaign.findOne({ _id: req.params.id, companyId: req.companyId })
      .populate('templateId')
      .populate('createdBy', 'name email');

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const recentDispatches = await WhatsAppCampaignRecipient.find({ campaignId: campaign._id })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      campaign,
      recentDispatches
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Campaign Preflight Engine (Safety Audit & Cost Prediction)
 */
router.post('/campaigns/preflight', requirePermission('marketing.campaign.create'), async (req, res) => {
  try {
    const { contacts = [], templateName, mediaUrl } = req.body;
    const { analyzeWhatsAppCampaignPreflight } = require('../services/campaignPreflightService');
    const preflight = await analyzeWhatsAppCampaignPreflight(req.companyId, {
      contacts,
      templateName,
      mediaUrl
    });
    res.json({ success: true, preflight });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Create WhatsApp Campaign (11-Step Builder API)
 */
router.post('/campaigns', requirePermission('marketing.campaign.create'), async (req, res) => {
  try {
    const {
      name,
      templateId,
      audienceType = 'SAVED_SEGMENT',
      audienceFilter = {},
      csvContacts = [],
      mediaId = null,
      variableMappings = {},
      scheduledAt = null
    } = req.body;

    if (!name || !templateId) {
      return res.status(400).json({ message: 'Campaign name and templateId are required' });
    }

    // 1. Verify template exists and is APPROVED
    const template = await WhatsAppTemplate.findOne({ _id: templateId, companyId: req.companyId });
    if (!template) {
      return res.status(404).json({ message: 'Selected template does not exist' });
    }
    if (template.status !== 'APPROVED') {
      return res.status(400).json({ message: `Template status is ${template.status}. Only APPROVED templates can be used for campaigns.` });
    }

    // 2. Fetch Media if provided
    let mediaUrl = null;
    let mediaType = 'NONE';
    if (mediaId) {
      const media = await WhatsAppMedia.findOne({ _id: mediaId, companyId: req.companyId });
      if (media) {
        mediaUrl = media.storageUrl;
        mediaType = media.fileType;
      }
    }

    // 3. Resolve Target Contacts based on audienceType
    let targetContacts = [];
    if (audienceType === 'CSV_UPLOAD' && Array.isArray(csvContacts) && csvContacts.length > 0) {
      // Process uploaded CSV list
      for (const item of csvContacts) {
        const phoneRes = normalizePhone(item.mobile || item.phone);
        if (phoneRes.valid) {
          targetContacts.push({
            name: item.name || 'Customer',
            mobile: phoneRes.normalized,
            normalizedPhone: phoneRes.normalized,
            email: item.email || null,
            city: item.city || null,
            state: item.state || null,
            dealerCode: item.dealerCode || null,
            product: item.product || null,
            whatsappOptIn: item.whatsappOptIn !== false,
            whatsappOptOut: false
          });
        }
      }
    } else {
      // Fetch contacts from DB matching filter
      const query = { companyId: req.companyId };
      if (audienceFilter.customerType) query.customerType = audienceFilter.customerType;
      if (audienceFilter.state) query.state = { $regex: audienceFilter.state, $options: 'i' };
      if (audienceFilter.city) query.city = { $regex: audienceFilter.city, $options: 'i' };
      if (audienceFilter.product) query.product = { $regex: audienceFilter.product, $options: 'i' };

      targetContacts = await WhatsAppContact.find(query).lean();
    }

    // 4. Compute Safety Statistics
    const seenPhones = new Set();
    const eligibleList = [];
    let invalidCount = 0;
    let duplicateCount = 0;
    let optOutCount = 0;

    for (const c of targetContacts) {
      const phoneNorm = normalizePhone(c.normalizedPhone || c.mobile);
      if (!phoneNorm.valid) {
        invalidCount++;
        continue;
      }

      const phone = phoneNorm.normalized;
      if (seenPhones.has(phone)) {
        duplicateCount++;
        continue;
      }
      seenPhones.add(phone);

      if (c.whatsappOptOut || !c.whatsappOptIn) {
        optOutCount++;
        continue;
      }

      // Compute variable values from mapping
      const variableValues = [];
      for (const v of (template.variables || [])) {
        const mappedSource = variableMappings[v.position] || `{{${v.name}}}`;
        let resolvedVal = '';

        if (mappedSource.includes('name')) resolvedVal = c.name || '';
        else if (mappedSource.includes('mobile')) resolvedVal = phone;
        else if (mappedSource.includes('email')) resolvedVal = c.email || '';
        else if (mappedSource.includes('city')) resolvedVal = c.city || '';
        else if (mappedSource.includes('state')) resolvedVal = c.state || '';
        else if (mappedSource.includes('dealerCode')) resolvedVal = c.dealerCode || '';
        else if (mappedSource.includes('product')) resolvedVal = c.product || '';
        else resolvedVal = mappedSource; // Literal string

        variableValues.push({ position: v.position, value: resolvedVal });
      }

      eligibleList.push({
        contactId: c._id || null,
        phone,
        name: c.name,
        variableValues
      });
    }

    // 5. Cost calculation & rate card
    const rateCard = await getRateCard(req.companyId);
    const ratePerMessage = rateCard[template.category] || rateCard.MARKETING;
    const estimatedCost = Number((eligibleList.length * ratePerMessage).toFixed(2));

    // 6. Create Campaign Record
    const campaign = new WhatsAppCampaign({
      companyId: req.companyId,
      name,
      templateId: template._id,
      templateName: template.name,
      templateLanguage: template.language,
      templateCategory: template.category,
      audienceType,
      audienceFilter,
      mediaId,
      mediaUrl,
      mediaType,
      variableMappings,
      stats: {
        totalRecipients: targetContacts.length,
        validCount: targetContacts.length - invalidCount,
        invalidCount,
        duplicateCount,
        optOutCount,
        eligibleCount: eligibleList.length,
        queuedCount: eligibleList.length
      },
      ratePerMessage,
      estimatedCost,
      status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdBy: req.user.id
    });
    await campaign.save();

    // 7. Insert Recipient Queue Records
    if (eligibleList.length > 0) {
      const recipientDocs = eligibleList.map(item => ({
        campaignId: campaign._id,
        companyId: req.companyId,
        contactId: item.contactId,
        phone: item.phone,
        name: item.name,
        variableValues: item.variableValues,
        mediaUrl,
        status: 'PENDING'
      }));

      await WhatsAppCampaignRecipient.insertMany(recipientDocs, { ordered: false });
    }

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'whatsapp.campaign.create',
      entity: 'WhatsAppCampaign',
      entityId: campaign._id,
      details: { name, eligibleCount: eligibleList.length, estimatedCost }
    });

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Test Message Send (Sends 1 live preview to a custom phone number)
 */
router.post('/campaigns/:id/test-message', requirePermission('marketing.campaign.create'), async (req, res) => {
  try {
    const { testPhone } = req.body;
    if (!testPhone) {
      return res.status(400).json({ message: 'testPhone number is required' });
    }

    const campaign = await WhatsAppCampaign.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const phoneNorm = normalizePhone(testPhone);
    if (!phoneNorm.valid) {
      return res.status(400).json({ message: phoneNorm.error });
    }

    // Sample variable values
    const sampleVals = Object.keys(campaign.variableMappings || {}).map(k => ({
      position: parseInt(k),
      value: 'TEST_SAMPLE'
    }));

    const result = await sendTemplateMessage({
      companyId: req.companyId,
      to: phoneNorm.normalized,
      templateName: campaign.templateName,
      language: campaign.templateLanguage,
      headerMediaUrl: campaign.mediaUrl,
      headerMediaType: campaign.mediaType,
      variableValues: sampleVals
    });

    res.json({
      message: `Test message dispatched to ${phoneNorm.normalized}`,
      result
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Launch / Send WhatsApp Campaign
 */
router.post('/campaigns/:id/send', requirePermission('marketing.campaign.send'), async (req, res) => {
  try {
    const campaign = await WhatsAppCampaign.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    // Validate wallet and quotas
    const budgetCheck = await validateCampaignBudget(
      req.companyId,
      campaign.stats.eligibleCount,
      campaign.templateCategory
    );

    if (!budgetCheck.allowed) {
      return res.status(402).json({
        message: budgetCheck.reason,
        code: budgetCheck.code
      });
    }

    const launchedCampaign = await launchCampaign(campaign._id, req.user.id);

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'whatsapp.campaign.launch',
      entity: 'WhatsAppCampaign',
      entityId: campaign._id,
      details: { eligibleCount: campaign.stats.eligibleCount, cost: campaign.estimatedCost }
    });

    res.json({
      message: `Campaign "${launchedCampaign.name}" launched into queue successfully`,
      campaign: launchedCampaign
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Pause Campaign
 */
router.post('/campaigns/:id/pause', requirePermission('marketing.campaign.pause'), async (req, res) => {
  try {
    const campaign = await pauseCampaign(req.params.id, req.body.reason || 'Paused by administrator');
    res.json({ message: 'Campaign paused', campaign });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Resume Campaign
 */
router.post('/campaigns/:id/resume', requirePermission('marketing.campaign.send'), async (req, res) => {
  try {
    const campaign = await resumeCampaign(req.params.id);
    res.json({ message: 'Campaign resumed', campaign });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Cancel Campaign
 */
router.post('/campaigns/:id/cancel', requirePermission('marketing.campaign.pause'), async (req, res) => {
  try {
    const campaign = await cancelCampaign(req.params.id);
    res.json({ message: 'Campaign cancelled', campaign });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// =========================================================================
// 7. WALLET & BILLING
// =========================================================================

/**
 * Get Wallet Details & Transactions
 */
router.get('/wallet', requirePermission('marketing.view'), async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.companyId);
    const rateCard = await getRateCard(req.companyId);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    const [todayUsage, monthUsage] = await Promise.all([
      WhatsAppUsage.findOne({ companyId: req.companyId, date: dateStr }),
      WhatsAppUsage.aggregate([
        { $match: { companyId: req.companyId, month: monthStr } },
        {
          $group: {
            _id: '$month',
            totalSent: { $sum: '$messagesSent' },
            totalCost: { $sum: '$totalCost' }
          }
        }
      ])
    ]);

    res.json({
      balance: wallet.balance,
      currency: wallet.currency,
      lowBalanceThreshold: wallet.lowBalanceThreshold,
      rateCard,
      usage: {
        todaySent: todayUsage?.messagesSent || 0,
        todayLimit: rateCard.dailyLimit,
        monthSent: monthUsage[0]?.totalSent || 0,
        monthLimit: rateCard.monthlyLimit
      },
      transactions: wallet.transactions.slice(-20).reverse()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Recharge Wallet
 */
router.post('/wallet/recharge', requirePermission('marketing.whatsapp.manage'), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A valid positive recharge amount is required' });
    }

    const wallet = await creditWallet(
      req.companyId,
      amount,
      `Wallet Recharge via ${req.body.paymentMethod || 'Online Transfer'}`,
      req.user.id
    );

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'whatsapp.wallet.recharge',
      entity: 'WhatsAppWallet',
      details: { amount, newBalance: wallet.balance }
    });

    res.json({
      message: `Wallet recharged successfully with ₹${amount}`,
      balance: wallet.balance
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// =========================================================================
// 8. INBOX & CONVERSATIONS
// =========================================================================

/**
 * List Conversations
 */
router.get('/inbox/conversations', requirePermission('marketing.view'), async (req, res) => {
  try {
    const conversations = await WhatsAppMessage.aggregate([
      { $match: { companyId: req.companyId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$content' },
          lastMessageType: { $first: '$messageType' },
          lastDirection: { $first: '$direction' },
          lastTimestamp: { $first: '$createdAt' },
          contactId: { $first: '$contactId' }
        }
      },
      { $sort: { lastTimestamp: -1 } },
      { $limit: 50 }
    ]);

    res.json({ success: true, count: conversations.length, data: conversations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get Conversation Messages
 */
router.get('/inbox/:conversationId/messages', requirePermission('marketing.view'), async (req, res) => {
  try {
    const messages = await WhatsAppMessage.find({
      companyId: req.companyId,
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 });

    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================================================================
// 9. ANALYTICS
// =========================================================================

/**
 * Marketing Analytics Overview
 */
router.get('/analytics/overview', requirePermission('marketing.analytics.view'), async (req, res) => {
  try {
    const [totalCampaigns, totalRecipients, sentCount, deliveredCount, readCount, failedCount] = await Promise.all([
      WhatsAppCampaign.countDocuments({ companyId: req.companyId }),
      WhatsAppCampaignRecipient.countDocuments({ companyId: req.companyId }),
      WhatsAppCampaignRecipient.countDocuments({ companyId: req.companyId, status: { $in: ['SENT', 'DELIVERED', 'READ'] } }),
      WhatsAppCampaignRecipient.countDocuments({ companyId: req.companyId, status: { $in: ['DELIVERED', 'READ'] } }),
      WhatsAppCampaignRecipient.countDocuments({ companyId: req.companyId, status: 'READ' }),
      WhatsAppCampaignRecipient.countDocuments({ companyId: req.companyId, status: 'FAILED' })
    ]);

    const deliveryRate = sentCount > 0 ? Number(((deliveredCount / sentCount) * 100).toFixed(1)) : 0;
    const readRate = deliveredCount > 0 ? Number(((readCount / deliveredCount) * 100).toFixed(1)) : 0;
    const failureRate = sentCount > 0 ? Number(((failedCount / (sentCount + failedCount)) * 100).toFixed(1)) : 0;

    res.json({
      totalCampaigns,
      totalRecipients,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      rates: {
        deliveryRate,
        readRate,
        failureRate
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
