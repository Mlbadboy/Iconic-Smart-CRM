const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const { decrypt } = require('./cryptoService');
const logger = require('./logger');

const META_GRAPH_VERSION = 'v20.0';
const META_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/**
 * Retrieves decrypted access token and account config for a company
 */
async function getAccountForCompany(companyId) {
  const account = await WhatsAppAccount.findOne({ companyId })
    .select('+encryptedAccessToken +encryptedWebhookSecret');
  
  if (!account) {
    throw new Error('WhatsApp Business Account not connected for this company');
  }
  
  if (account.connectionStatus !== 'CONNECTED') {
    throw new Error(`WhatsApp Business Account connection is ${account.connectionStatus}`);
  }

  const accessToken = decrypt(account.encryptedAccessToken);
  if (!accessToken) {
    throw new Error('Failed to decrypt WhatsApp access token');
  }

  return {
    account,
    accessToken,
    phoneNumberId: account.phoneNumberId,
    wabaId: account.wabaId
  };
}

/**
 * Tests connection with Meta WhatsApp Cloud API
 */
async function testConnection(wabaId, phoneNumberId, accessToken) {
  try {
    // If running in local test mode with mock credentials
    if (accessToken.startsWith('mock_') || wabaId.startsWith('mock_')) {
      return {
        success: true,
        verifiedName: "Charlie's Test Brand",
        displayPhoneNumber: "+91 98765 43210",
        qualityRating: "GREEN",
        messagingLimit: "TIER_10K"
      };
    }

    const response = await axios.get(`${META_BASE_URL}/${phoneNumberId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier'
      },
      timeout: 10000
    });

    return {
      success: true,
      verifiedName: response.data.verified_name || 'Verified Business',
      displayPhoneNumber: response.data.display_phone_number || '',
      qualityRating: response.data.quality_rating || 'GREEN',
      messagingLimit: response.data.messaging_limit_tier || 'TIER_1K'
    };
  } catch (err) {
    logger.error('Meta WhatsApp connection test error:', err.response?.data || err.message);
    // If it's a test environment network block, provide clean failure reason
    const message = err.response?.data?.error?.message || err.message;
    return {
      success: false,
      error: message
    };
  }
}

/**
 * Synchronizes templates from Meta WABA into local collection
 */
async function syncTemplates(companyId) {
  const { account, accessToken, wabaId } = await getAccountForCompany(companyId);

  // Mock template list for development/test mode
  if (accessToken.startsWith('mock_') || wabaId.startsWith('mock_')) {
    const mockTemplates = [
      {
        templateId: `tmpl_summer_${companyId}`,
        name: 'summer_promo_2026',
        category: 'MARKETING',
        language: 'en_US',
        status: 'APPROVED',
        headerType: 'IMAGE',
        bodyText: 'Hello {{1}}, enjoy exclusive discounts on {{2}} today! Valid till {{3}}.',
        footerText: 'Charlie CRM • Reply STOP to unsubscribe',
        buttons: [{ type: 'URL', text: 'Shop Now', url: 'https://charlieai.in/offers' }],
        variables: [
          { position: 1, name: 'name', exampleValue: 'Rahul' },
          { position: 2, name: 'product', exampleValue: 'Smart Sensor' },
          { position: 3, name: 'expiry', exampleValue: '30th Sept' }
        ]
      },
      {
        templateId: `tmpl_warranty_${companyId}`,
        name: 'warranty_expiry_alert',
        category: 'UTILITY',
        language: 'en_US',
        status: 'APPROVED',
        headerType: 'NONE',
        bodyText: 'Hi {{1}}, your warranty for product {{2}} expires on {{3}}. Renew now to stay protected.',
        footerText: 'Charlie Support Desk',
        buttons: [{ type: 'QUICK_REPLY', text: 'Renew Warranty' }],
        variables: [
          { position: 1, name: 'name', exampleValue: 'Priya' },
          { position: 2, name: 'product', exampleValue: 'Water Heater' },
          { position: 3, name: 'warrantyExpiry', exampleValue: '15-Oct-2026' }
        ]
      },
      {
        templateId: `tmpl_dealer_update_${companyId}`,
        name: 'dealer_stock_announcement',
        category: 'MARKETING',
        language: 'en_US',
        status: 'APPROVED',
        headerType: 'DOCUMENT',
        bodyText: 'Dear Dealer {{1}} (Code: {{2}}), new stock for {{3}} has arrived at your regional warehouse.',
        footerText: 'Charlie Distribution Network',
        buttons: [{ type: 'URL', text: 'View Catalog', url: 'https://charlieai.in/catalog' }],
        variables: [
          { position: 1, name: 'name', exampleValue: 'Amit Enterprise' },
          { position: 2, name: 'dealerCode', exampleValue: '55262' },
          { position: 3, name: 'product', exampleValue: 'UTIXK Series' }
        ]
      }
    ];

    for (const t of mockTemplates) {
      await WhatsAppTemplate.findOneAndUpdate(
        { companyId, name: t.name, language: t.language },
        { ...t, companyId, lastSyncedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    account.lastSyncAt = new Date();
    await account.save();

    return { syncedCount: mockTemplates.length, templates: mockTemplates };
  }

  try {
    const response = await axios.get(`${META_BASE_URL}/${wabaId}/message_templates`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { limit: 100 },
      timeout: 15000
    });

    const metaTemplates = response.data.data || [];
    let synced = 0;

    for (const metaT of metaTemplates) {
      const components = metaT.components || [];
      const headerComp = components.find(c => c.type === 'HEADER');
      const bodyComp = components.find(c => c.type === 'BODY') || {};
      const footerComp = components.find(c => c.type === 'FOOTER');
      const buttonsComp = components.find(c => c.type === 'BUTTONS');

      // Extract variables from body text (e.g. {{1}}, {{2}})
      const bodyText = bodyComp.text || '';
      const varMatches = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)];
      const variables = varMatches.map(m => ({
        position: parseInt(m[1]),
        name: `param_${m[1]}`,
        exampleValue: ''
      }));

      const buttons = (buttonsComp?.buttons || []).map(b => ({
        type: b.type === 'PHONE_NUMBER' ? 'PHONE_NUMBER' : (b.type === 'URL' ? 'URL' : 'QUICK_REPLY'),
        text: b.text,
        url: b.url,
        phoneNumber: b.phone_number
      }));

      await WhatsAppTemplate.findOneAndUpdate(
        { companyId, name: metaT.name, language: metaT.language },
        {
          companyId,
          templateId: metaT.id,
          name: metaT.name,
          category: metaT.category,
          language: metaT.language,
          status: metaT.status,
          headerType: headerComp?.format || (headerComp?.text ? 'TEXT' : 'NONE'),
          headerText: headerComp?.text || null,
          bodyText,
          footerText: footerComp?.text || null,
          buttons,
          variables,
          rawComponents: components,
          lastSyncedAt: new Date()
        },
        { upsert: true, new: true }
      );
      synced++;
    }

    account.lastSyncAt = new Date();
    await account.save();

    return { syncedCount: synced };
  } catch (err) {
    logger.error('Failed to sync WhatsApp templates from Meta:', err.response?.data || err.message);
    throw new Error(`Template sync failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Uploads media file to Meta WhatsApp Cloud API
 */
async function uploadMedia(companyId, filePath, mimeType) {
  const { accessToken, phoneNumberId } = await getAccountForCompany(companyId);

  if (accessToken.startsWith('mock_') || phoneNumberId.startsWith('mock_')) {
    return {
      whatsappMediaId: `mock_media_${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  try {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);
    formData.append('file', fs.createReadStream(filePath));

    const response = await axios.post(`${META_BASE_URL}/${phoneNumberId}/media`, formData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    return {
      whatsappMediaId: response.data.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  } catch (err) {
    logger.error('Meta media upload failed:', err.response?.data || err.message);
    throw new Error(`Media upload failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Sends a single template message to a recipient
 */
async function sendTemplateMessage({
  companyId,
  to,
  templateName,
  language = 'en_US',
  headerMediaUrl = null,
  headerMediaType = null,
  variableValues = []
}) {
  const { accessToken, phoneNumberId } = await getAccountForCompany(companyId);

  // Clean and format recipient phone (digits only, e.g. 919876543210)
  const cleanTo = String(to).replace(/\D/g, '');

  // Build Meta Cloud API payload components
  const components = [];

  // 1. Header Media or Text Component if applicable
  if (headerMediaUrl && headerMediaType && headerMediaType !== 'NONE') {
    const mediaParam = {};
    const typeKey = headerMediaType.toLowerCase(); // image, video, document
    mediaParam[typeKey] = { link: headerMediaUrl };

    components.push({
      type: 'header',
      parameters: [{
        type: typeKey,
        ...mediaParam
      }]
    });
  }

  // 2. Body Parameters Component
  if (variableValues && variableValues.length > 0) {
    const parameters = variableValues.map(val => ({
      type: 'text',
      text: String(val.value || '')
    }));

    components.push({
      type: 'body',
      parameters
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      ...(components.length > 0 && { components })
    }
  };

  // Mock send mode for tests/development
  if (accessToken.startsWith('mock_') || phoneNumberId.startsWith('mock_')) {
    const mockWamid = `wamid.HBgL${Date.now()}MockMsg${Math.random().toString(36).substring(2, 8)}`;
    return {
      success: true,
      wamid: mockWamid,
      status: 'SENT'
    };
  }

  try {
    const response = await axios.post(`${META_BASE_URL}/${phoneNumberId}/messages`, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const wamid = response.data.messages?.[0]?.id || `wamid.${Date.now()}`;
    return {
      success: true,
      wamid,
      status: 'SENT'
    };
  } catch (err) {
    const errorDetails = err.response?.data?.error || {};
    logger.error(`Meta sendTemplateMessage error to ${cleanTo}:`, errorDetails.message || err.message);
    return {
      success: false,
      error: errorDetails.message || err.message,
      errorCode: errorDetails.code || 'SEND_ERROR'
    };
  }
}

/**
 * Sends a regular text reply inside the 24hr service window
 */
async function sendTextMessage({ companyId, to, textBody }) {
  const { accessToken, phoneNumberId } = await getAccountForCompany(companyId);
  const cleanTo = String(to).replace(/\D/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: { body: textBody }
  };

  if (accessToken.startsWith('mock_') || phoneNumberId.startsWith('mock_')) {
    return {
      success: true,
      wamid: `wamid.HBgL${Date.now()}TextMock`,
      status: 'SENT'
    };
  }

  try {
    const response = await axios.post(`${META_BASE_URL}/${phoneNumberId}/messages`, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      success: true,
      wamid: response.data.messages?.[0]?.id || `wamid.${Date.now()}`,
      status: 'SENT'
    };
  } catch (err) {
    logger.error(`Meta sendTextMessage error to ${cleanTo}:`, err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || err.message);
  }
}

module.exports = {
  getAccountForCompany,
  testConnection,
  syncTemplates,
  uploadMedia,
  sendTemplateMessage,
  sendTextMessage
};
