const AuditEvent = require('../models/AuditEvent');
const logger = require('./logger');

function actorFromRequest(req) {
  return {
    actorId: req.user?.id,
    actorRole: req.user?.role,
    source: 'api',
    ip: req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress
  };
}

async function recordAuditEvent(req, event) {
  try {
    await AuditEvent.create({
      ...actorFromRequest(req),
      ...event,
      entityId: String(event.entityId)
    });
  } catch (error) {
    logger.error('Failed to record audit event:', error.message);
  }
}

module.exports = { recordAuditEvent, actorFromRequest };
