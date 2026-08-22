const MarketingAuditLog = require('../models/MarketingAuditLog');
const logger = require('./logger');

/**
 * Records an immutable audit log entry for any marketing action
 */
async function logMarketingEvent(eventData) {
  try {
    const {
      companyId,
      userId = null,
      userName = 'System',
      action,
      channel,
      targetType = null,
      targetId = null,
      targetTitle = null,
      previousState = null,
      newState = null,
      budget = null,
      externalId = null,
      ipAddress = null,
      userAgent = null,
      metadata = {}
    } = eventData;

    const logEntry = await MarketingAuditLog.create({
      companyId,
      userId,
      userName,
      action,
      channel,
      targetType,
      targetId: targetId ? String(targetId) : null,
      targetTitle,
      previousState,
      newState,
      budget,
      externalId,
      ipAddress,
      userAgent,
      metadata
    });

    logger.info(`📝 [Marketing Audit] ${action} on ${channel} by ${userName} (${companyId})`);
    return logEntry;
  } catch (err) {
    logger.warn('Failed to record marketing audit log:', err.message);
    return null;
  }
}

module.exports = {
  logMarketingEvent
};
