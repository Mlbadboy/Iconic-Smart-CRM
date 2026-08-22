const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const { logMarketingEvent } = require('./marketingAuditService');
const logger = require('./logger');

const VALID_TRANSITIONS = {
  DRAFT: ['PREFLIGHT_RUNNING', 'PREFLIGHT_PASSED', 'CANCELLED'],
  PREFLIGHT_RUNNING: ['PREFLIGHT_PASSED', 'PREFLIGHT_FAILED', 'CANCELLED'],
  PREFLIGHT_FAILED: ['DRAFT', 'PREFLIGHT_RUNNING', 'CANCELLED'],
  PREFLIGHT_PASSED: ['AWAITING_APPROVAL', 'APPROVED', 'QUEUED', 'CANCELLED'],
  AWAITING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['QUEUED', 'SCHEDULED', 'CANCELLED'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  SCHEDULED: ['QUEUED', 'CANCELLED'],
  QUEUED: ['PROCESSING', 'PAUSED', 'CANCELLED', 'FAILED'],
  PROCESSING: ['PARTIALLY_SENT', 'COMPLETED', 'PAUSED', 'FAILED'],
  PARTIALLY_SENT: ['PROCESSING', 'COMPLETED', 'FAILED'],
  PAUSED: ['QUEUED', 'PROCESSING', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: ['QUEUED', 'DRAFT']
};

/**
 * Transitions a campaign to a new state if the transition is valid
 */
async function transitionCampaignState(campaignId, companyId, targetState, metadata = {}, userId = null) {
  const campaign = await WhatsAppCampaign.findOne({ _id: campaignId, companyId });
  if (!campaign) throw new Error('Campaign not found');

  const currentState = campaign.status || 'DRAFT';

  // If already in target state
  if (currentState === targetState) {
    return campaign;
  }

  const allowedNextStates = VALID_TRANSITIONS[currentState] || [];
  if (!allowedNextStates.includes(targetState)) {
    const errorMsg = `Invalid campaign state transition from "${currentState}" to "${targetState}". Allowed transitions: [${allowedNextStates.join(', ')}]`;
    logger.warn(`🚫 State Machine Blocked: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  campaign.status = targetState;

  if (targetState === 'PROCESSING' && !campaign.startedAt) {
    campaign.startedAt = new Date();
  }
  if (targetState === 'COMPLETED' || targetState === 'CANCELLED' || targetState === 'FAILED') {
    campaign.completedAt = new Date();
  }
  if (targetState === 'PAUSED') {
    campaign.pauseReason = metadata.reason || 'Manually paused by operator';
  }

  await campaign.save();

  // Immutable Audit Log
  await logMarketingEvent({
    companyId,
    userId,
    action: `CAMPAIGN_STATE_TRANSITION_${targetState}`,
    channel: 'WHATSAPP',
    targetType: 'CAMPAIGN',
    targetId: campaign._id,
    targetTitle: campaign.name,
    previousState: currentState,
    newState: targetState,
    metadata
  });

  logger.info(`🔄 [State Machine] Campaign "${campaign.name}" (${campaign._id}): ${currentState} ➔ ${targetState}`);
  return campaign;
}

module.exports = {
  VALID_TRANSITIONS,
  transitionCampaignState
};
