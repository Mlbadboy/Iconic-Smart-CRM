const SlaTimer = require('../models/SlaTimer');
const escalationService = require('./escalationService');
const logger = require('./logger');

// Priority-based rules for SLAs (in milliseconds)
const RULES = {
  'service-request': {
    response: {
      urgent: 1 * 60 * 60 * 1000,      // 1 hour
      high: 4 * 60 * 60 * 1000,        // 4 hours
      medium: 24 * 60 * 60 * 1000,     // 24 hours
      low: 48 * 60 * 60 * 1000         // 48 hours
    },
    resolution: {
      urgent: 4 * 60 * 60 * 1000,      // 4 hours
      high: 24 * 60 * 60 * 1000,       // 24 hours
      medium: 72 * 60 * 60 * 1000,     // 72 hours
      low: 120 * 60 * 60 * 1000        // 120 hours
    }
  },
  lead: {
    response: {
      new: 4 * 60 * 60 * 1000,         // 4 hours
      default: 24 * 60 * 60 * 1000     // 24 hours
    }
  },
  opportunity: {
    response: {
      prospecting: 24 * 60 * 60 * 1000, // 24 hours
      default: 48 * 60 * 60 * 1000     // 48 hours
    }
  },
  order: {
    resolution: {
      default: 48 * 60 * 60 * 1000     // 48 hours
    }
  }
};

function getDuration(entityType, slaType, priority = 'medium') {
  const domainRules = RULES[entityType]?.[slaType];
  if (!domainRules) return 24 * 60 * 60 * 1000; // default 24 hours
  return domainRules[priority] || domainRules.default || 24 * 60 * 60 * 1000;
}

async function createTimer(entityType, entityId, priority, slaType) {
  try {
    const duration = getDuration(entityType, slaType, priority);
    const now = new Date();
    const targetTime = new Date(now.getTime() + duration);
    const warningTime = new Date(now.getTime() + duration * 0.8); // warn at 80% duration

    // Ensure we don't duplicate active timers for same entity/type
    await SlaTimer.deleteMany({ entityType, entityId, slaType, status: 'active' });

    const timer = new SlaTimer({
      entityType,
      entityId,
      slaType,
      targetTime,
      warningTime,
      status: 'active'
    });

    await timer.save();
    logger.info(`⏰ SLA Timer created for ${entityType} ${entityId} (${slaType}). Target: ${targetTime.toISOString()}`);
    return timer;
  } catch (error) {
    logger.error('Error creating SLA timer:', error);
    throw error;
  }
}

async function completeTimer(entityType, entityId, slaType) {
  try {
    const timer = await SlaTimer.findOne({ entityType, entityId, slaType, status: { $in: ['active', 'paused'] } });
    if (!timer) return null;

    timer.status = 'completed';
    timer.completedAt = new Date();
    await timer.save();
    logger.info(`⏰ SLA Timer completed for ${entityType} ${entityId} (${slaType})`);
    return timer;
  } catch (error) {
    logger.error('Error completing SLA timer:', error);
    throw error;
  }
}

async function pauseTimer(entityType, entityId, slaType) {
  try {
    const timer = await SlaTimer.findOne({ entityType, entityId, slaType, status: 'active' });
    if (!timer) return null;

    timer.status = 'paused';
    timer.pausedAt = new Date();
    await timer.save();
    logger.info(`⏰ SLA Timer paused for ${entityType} ${entityId} (${slaType})`);
    return timer;
  } catch (error) {
    logger.error('Error pausing SLA timer:', error);
    throw error;
  }
}

async function resumeTimer(entityType, entityId, slaType) {
  try {
    const timer = await SlaTimer.findOne({ entityType, entityId, slaType, status: 'paused' });
    if (!timer) return null;

    const pauseDuration = Date.now() - timer.pausedAt.getTime();
    timer.targetTime = new Date(timer.targetTime.getTime() + pauseDuration);
    timer.warningTime = new Date(timer.warningTime.getTime() + pauseDuration);
    timer.status = 'active';
    timer.pausedAt = undefined;

    await timer.save();
    logger.info(`⏰ SLA Timer resumed for ${entityType} ${entityId} (${slaType}). New target: ${timer.targetTime.toISOString()}`);
    return timer;
  } catch (error) {
    logger.error('Error resuming SLA timer:', error);
    throw error;
  }
}

async function checkBreaches(io) {
  try {
    const now = new Date();
    const breachedTimers = await SlaTimer.find({
      status: 'active',
      targetTime: { $lt: now }
    });

    for (const timer of breachedTimers) {
      timer.status = 'breached';
      timer.breachedAt = now;
      await timer.save();

      logger.warn(`🚨 SLA BREACH detected for ${timer.entityType} ${timer.entityId} (${timer.slaType})`);

      // Trigger escalation
      await escalationService.escalateBreach(timer, io);
    }
  } catch (error) {
    logger.error('Error checking SLA breaches:', error);
  }
}

module.exports = {
  createTimer,
  completeTimer,
  pauseTimer,
  resumeTimer,
  checkBreaches
};
