const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppCampaignRecipient = require('../models/WhatsAppCampaignRecipient');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const { sendTemplateMessage } = require('./whatsAppService');
const { debitWallet, recordUsage } = require('./whatsAppBillingService');
const logger = require('./logger');

const mongoose = require('mongoose');

let isWorkerRunning = false;
let workerInterval = null;
let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

/**
 * Broadcasts campaign progress to connected clients in the tenant room
 */
function emitCampaignProgress(companyId, campaign) {
  if (ioInstance) {
    ioInstance.to(`user-${campaign.createdBy}`).emit('campaign:progress', {
      campaignId: campaign._id,
      stats: campaign.stats,
      status: campaign.status
    });
  }
}

/**
 * Main queue processing loop
 */
async function processQueueBatch() {
  if (isWorkerRunning) return;
  if (mongoose.connection.readyState !== 1) return;
  isWorkerRunning = true;

  try {
    // 1. Find active processing campaigns
    const activeCampaigns = await WhatsAppCampaign.find({
      status: 'PROCESSING'
    }).limit(5);

    for (const campaign of activeCampaigns) {
      // 2. Fetch a batch of pending/retry recipients (up to 20 per tick)
      const recipients = await WhatsAppCampaignRecipient.find({
        campaignId: campaign._id,
        status: { $in: ['PENDING', 'RETRY'] }
      }).limit(20);

      if (recipients.length === 0) {
        // Check if there are any still in 'PROCESSING'
        const inFlight = await WhatsAppCampaignRecipient.countDocuments({
          campaignId: campaign._id,
          status: 'PROCESSING'
        });

        if (inFlight === 0) {
          // Campaign completed!
          campaign.status = 'COMPLETED';
          campaign.completedAt = new Date();
          await campaign.save();
          logger.info(`🎉 Campaign "${campaign.name}" (${campaign._id}) completed successfully!`);
          emitCampaignProgress(campaign.companyId, campaign);
        }
        continue;
      }

      for (const rec of recipients) {
        // Re-check if campaign got paused or cancelled mid-batch
        const freshCampaign = await WhatsAppCampaign.findById(campaign._id);
        if (freshCampaign.status !== 'PROCESSING') {
          break;
        }

        // Mark as PROCESSING to prevent duplicate pickup
        rec.status = 'PROCESSING';
        await rec.save();

        // Dispatch via WhatsApp Cloud API
        const sendResult = await sendTemplateMessage({
          companyId: campaign.companyId,
          to: rec.phone,
          templateName: campaign.templateName,
          language: campaign.templateLanguage,
          headerMediaUrl: campaign.mediaUrl,
          headerMediaType: campaign.mediaType,
          variableValues: rec.variableValues
        });

        if (sendResult.success) {
          rec.status = 'SENT';
          rec.wamid = sendResult.wamid;
          rec.sentAt = new Date();
          await rec.save();

          campaign.stats.sentCount = (campaign.stats.sentCount || 0) + 1;
          campaign.stats.queuedCount = Math.max(0, (campaign.stats.queuedCount || 0) - 1);
          campaign.actualCost = Number(((campaign.stats.sentCount * campaign.ratePerMessage)).toFixed(2));

          // Record unified message document
          await WhatsAppMessage.create({
            companyId: campaign.companyId,
            direction: 'OUTBOUND',
            from: 'system',
            to: rec.phone,
            messageType: 'template',
            content: `Template: ${campaign.templateName}`,
            mediaUrl: campaign.mediaUrl,
            wamid: sendResult.wamid,
            campaignId: campaign._id,
            contactId: rec.contactId,
            status: 'SENT'
          });

          // Record usage metrics
          await recordUsage(campaign.companyId, campaign.templateCategory, 'SENT', campaign.ratePerMessage);
        } else {
          rec.retryCount = (rec.retryCount || 0) + 1;
          rec.lastError = sendResult.error;
          rec.errorCode = sendResult.errorCode;

          if (rec.retryCount < rec.maxRetries) {
            rec.status = 'RETRY';
          } else {
            rec.status = 'FAILED';
            rec.failedAt = new Date();
            campaign.stats.failedCount = (campaign.stats.failedCount || 0) + 1;
            campaign.stats.queuedCount = Math.max(0, (campaign.stats.queuedCount || 0) - 1);
            await recordUsage(campaign.companyId, campaign.templateCategory, 'FAILED', 0);
          }
          await rec.save();
        }

        // 3. High Failure Rate Threshold Guard (Auto-Pause)
        const attempted = (campaign.stats.sentCount || 0) + (campaign.stats.failedCount || 0);
        if (attempted >= 20) {
          const failureRate = ((campaign.stats.failedCount || 0) / attempted) * 100;
          if (failureRate >= campaign.failureThresholdPercent) {
            campaign.status = 'PAUSED';
            campaign.pauseReason = `High failure rate detected (${failureRate.toFixed(1)}% > ${campaign.failureThresholdPercent}% threshold). Auto-paused to protect messaging quality score.`;
            logger.warn(`⚠️ Auto-pausing Campaign ${campaign._id}: ${campaign.pauseReason}`);
            await campaign.save();
            emitCampaignProgress(campaign.companyId, campaign);
            break;
          }
        }
      }

      await campaign.save();
      emitCampaignProgress(campaign.companyId, campaign);
    }
  } catch (err) {
    logger.error('Error in WhatsApp queue processing tick:', err);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Launches an approved campaign into the queue
 */
async function launchCampaign(campaignId, userId) {
  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status === 'PROCESSING' || campaign.status === 'COMPLETED') {
    throw new Error(`Campaign is already in ${campaign.status} status`);
  }

  // Populate recipients count and debit wallet
  const pendingCount = await WhatsAppCampaignRecipient.countDocuments({
    campaignId: campaign._id,
    status: { $in: ['PENDING', 'RETRY'] }
  });

  if (pendingCount === 0) {
    throw new Error('No eligible recipients found in this campaign');
  }

  const cost = Number((pendingCount * campaign.ratePerMessage).toFixed(2));
  await debitWallet(
    campaign.companyId,
    cost,
    `WhatsApp Campaign: ${campaign.name} (${pendingCount} messages)`,
    campaign._id,
    userId
  );

  campaign.status = 'PROCESSING';
  campaign.startedAt = new Date();
  campaign.approvedBy = userId;
  campaign.stats.queuedCount = pendingCount;
  await campaign.save();

  logger.info(`🚀 Launched WhatsApp Campaign "${campaign.name}" with ${pendingCount} recipients.`);
  emitCampaignProgress(campaign.companyId, campaign);
  return campaign;
}

/**
 * Pauses an active campaign
 */
async function pauseCampaign(campaignId, reason = 'Paused by user') {
  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status !== 'PROCESSING') {
    throw new Error(`Cannot pause a campaign in ${campaign.status} status`);
  }

  campaign.status = 'PAUSED';
  campaign.pauseReason = reason;
  await campaign.save();
  emitCampaignProgress(campaign.companyId, campaign);
  return campaign;
}

/**
 * Resumes a paused campaign
 */
async function resumeCampaign(campaignId) {
  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status !== 'PAUSED') {
    throw new Error(`Cannot resume a campaign in ${campaign.status} status`);
  }

  campaign.status = 'PROCESSING';
  campaign.pauseReason = null;
  await campaign.save();
  emitCampaignProgress(campaign.companyId, campaign);
  return campaign;
}

/**
 * Cancels a campaign
 */
async function cancelCampaign(campaignId) {
  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
    throw new Error(`Campaign is already ${campaign.status}`);
  }

  campaign.status = 'CANCELLED';
  await campaign.save();

  // Mark all un-sent recipients as CANCELLED
  await WhatsAppCampaignRecipient.updateMany(
    { campaignId: campaign._id, status: { $in: ['PENDING', 'PROCESSING', 'RETRY'] } },
    { status: 'CANCELLED' }
  );

  emitCampaignProgress(campaign.companyId, campaign);
  return campaign;
}

/**
 * Starts the persistent background queue polling interval
 */
function startQueueWorker(intervalMs = 1500) {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = setInterval(processQueueBatch, intervalMs);
  logger.info('⚡ WhatsApp persistent message queue worker started.');
}

function stopQueueWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

module.exports = {
  setSocketIO,
  startQueueWorker,
  stopQueueWorker,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  processQueueBatch
};
