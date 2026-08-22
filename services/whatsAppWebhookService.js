const crypto = require('crypto');
const WhatsAppWebhookEvent = require('../models/WhatsAppWebhookEvent');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppCampaignRecipient = require('../models/WhatsAppCampaignRecipient');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppContact = require('../models/WhatsAppContact');
const Lead = require('../models/Lead');
const { recordUsage } = require('./whatsAppBillingService');
const { normalizePhone } = require('./whatsAppContactService');
const logger = require('./logger');

/**
 * Validates Meta Webhook signature (SHA256 HMAC)
 */
function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return true; // Bypass in mock test environment if secret is not set
  try {
    const signatureParts = signatureHeader.split('sha256=');
    if (signatureParts.length !== 2) return false;
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signatureParts[1]), Buffer.from(expectedSignature));
  } catch (err) {
    return false;
  }
}

/**
 * Processes incoming webhook payload from Meta
 */
async function processWebhookPayload(payload) {
  if (!payload || payload.object !== 'whatsapp_business_account') {
    return { status: 'IGNORED' };
  }

  const entries = payload.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;

      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;

      // Identify company from phoneNumberId or WABA ID
      const account = await WhatsAppAccount.findOne({
        $or: [
          { phoneNumberId },
          { wabaId: entry.id }
        ]
      });

      const companyId = account?.companyId || null;

      // 1. Process Status Receipts (sent, delivered, read, failed)
      const statuses = value.statuses || [];
      for (const statusObj of statuses) {
        const wamid = statusObj.id;
        const statusType = (statusObj.status || '').toUpperCase(); // DELIVERED, READ, FAILED, SENT

        // Log raw webhook event
        await WhatsAppWebhookEvent.create({
          companyId,
          phoneNumberId,
          eventType: 'status',
          wamid,
          status: statusType,
          rawEvent: statusObj,
          processed: true,
          processedAt: new Date()
        });

        // Update campaign recipient if matched
        const recipient = await WhatsAppCampaignRecipient.findOne({ wamid });
        if (recipient) {
          recipient.status = statusType;
          if (statusType === 'DELIVERED') recipient.deliveredAt = new Date();
          if (statusType === 'READ') recipient.readAt = new Date();
          if (statusType === 'FAILED') {
            recipient.failedAt = new Date();
            recipient.lastError = statusObj.errors?.[0]?.message || 'Delivery failed';
          }
          await recipient.save();

          // Update Campaign aggregate stats
          const campaign = await WhatsAppCampaign.findById(recipient.campaignId);
          if (campaign) {
            if (statusType === 'DELIVERED') campaign.stats.deliveredCount = (campaign.stats.deliveredCount || 0) + 1;
            if (statusType === 'READ') campaign.stats.readCount = (campaign.stats.readCount || 0) + 1;
            if (statusType === 'FAILED') campaign.stats.failedCount = (campaign.stats.failedCount || 0) + 1;
            await campaign.save();
          }

          if (companyId) {
            await recordUsage(companyId, 'MARKETING', statusType, 0);
          }
        }
      }

      // 2. Process Inbound Customer Messages
      const messages = value.messages || [];
      const contacts = value.contacts || [];

      for (const msg of messages) {
        const senderPhone = msg.from;
        const phoneNorm = normalizePhone(senderPhone);
        const normalized = phoneNorm.valid ? phoneNorm.normalized : `+${senderPhone}`;
        const contactProfile = contacts.find(c => c.wa_id === senderPhone) || {};
        const profileName = contactProfile.profile?.name || 'Customer';

        // Extract message text or media
        let messageText = '';
        let messageType = msg.type || 'text';

        if (messageType === 'text') {
          messageText = msg.text?.body || '';
        } else if (['image', 'video', 'document', 'audio'].includes(messageType)) {
          messageText = `[${messageType.toUpperCase()}] ${msg[messageType]?.caption || ''}`;
        } else if (messageType === 'button') {
          messageText = msg.button?.text || '';
        } else if (messageType === 'interactive') {
          messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive Response]';
        }

        // Handle STOP / Unsubscribe requests
        const isOptOutCommand = /^(stop|unsubscribe|cancel|quit|optout)$/i.test(messageText.trim());

        // Find or create WhatsApp contact
        let contact = null;
        if (companyId) {
          contact = await WhatsAppContact.findOne({ companyId, normalizedPhone: normalized });
          if (!contact) {
            contact = new WhatsAppContact({
              companyId,
              name: profileName,
              mobile: senderPhone,
              normalizedPhone: normalized,
              whatsappOptIn: !isOptOutCommand,
              whatsappOptOut: isOptOutCommand,
              whatsappOptOutAt: isOptOutCommand ? new Date() : null,
              optOutReason: isOptOutCommand ? 'Replied STOP keyword' : null,
              whatsappOptInSource: 'INBOUND_MESSAGE'
            });
            await contact.save();
          } else if (isOptOutCommand) {
            contact.whatsappOptOut = true;
            contact.whatsappOptOutAt = new Date();
            contact.optOutReason = 'Replied STOP keyword';
            await contact.save();
            logger.info(`🚫 Opt-out processed for ${normalized}`);
          }
        }

        // Save unified incoming message
        await WhatsAppMessage.create({
          companyId,
          direction: 'INBOUND',
          from: normalized,
          to: value.metadata?.display_phone_number || 'Business',
          messageType,
          content: messageText,
          wamid: msg.id,
          conversationId: normalized,
          contactId: contact?._id || null,
          status: 'RECEIVED',
          rawPayload: msg
        });

        // Check if message indicates purchase intent -> convert to Lead automatically
        if (companyId && !isOptOutCommand && /buy|quote|price|interested|order|inquiry/i.test(messageText)) {
          try {
            const existingLead = await Lead.findOne({ phone: normalized, companyId });
            if (!existingLead) {
              await Lead.create({
                name: profileName,
                phone: normalized,
                companyId,
                source: 'WhatsApp Campaign Reply',
                status: 'New',
                notes: `Inbound WhatsApp message: "${messageText}"`
              });
              logger.info(`✨ Auto-converted inbound WhatsApp reply to Lead for ${normalized}`);
            }
          } catch (e) {
            logger.warn('Auto lead conversion notice:', e.message);
          }
        }
      }
    }
  }

  return { status: 'PROCESSED' };
}

module.exports = {
  verifyWebhookSignature,
  processWebhookPayload
};
