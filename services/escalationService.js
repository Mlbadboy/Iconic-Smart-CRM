const Escalation = require('../models/Escalation');
const ServiceRequest = require('../models/ServiceRequest');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Order = require('../models/Order');
const logger = require('./logger');
const notificationService = require('./notificationService');

async function escalateBreach(timer, io) {
  try {
    let previousOwner = 'unassigned';
    let escalatedTo = 'manager';

    // Retrieve previous owner and update priority/status in the domain record if needed
    if (timer.entityType === 'service-request') {
      const sr = await ServiceRequest.findById(timer.entityId);
      if (sr) {
        previousOwner = sr.assignedTo || 'unassigned';
        escalatedTo = 'service-manager';
        sr.priority = 'urgent'; // upgrade priority on SLA breach
        await sr.save();
      }
    } else if (timer.entityType === 'lead') {
      const lead = await Lead.findById(timer.entityId);
      if (lead) {
        previousOwner = lead.assignedTo || 'unassigned';
        escalatedTo = 'sales-manager';
      }
    } else if (timer.entityType === 'opportunity') {
      const opp = await Opportunity.findById(timer.entityId);
      if (opp) {
        previousOwner = opp.assignedTo || 'unassigned';
        escalatedTo = 'sales-manager';
      }
    } else if (timer.entityType === 'order') {
      const order = await Order.findById(timer.entityId);
      if (order) {
        previousOwner = order.userId ? order.userId.toString() : 'unassigned';
        escalatedTo = 'operations-manager';
      }
    }

    const escalation = new Escalation({
      slaTimerId: timer._id,
      entityType: timer.entityType,
      entityId: timer.entityId,
      previousOwner,
      escalatedTo,
      reason: `SLA breach on ${timer.slaType} timer`,
      priority: 'high',
      status: 'open'
    });

    await escalation.save();
    logger.warn(`🚨 Escalation recorded: ${timer.entityType} ${timer.entityId} escalated to ${escalatedTo}`);

    // Dispatch real-time Socket.IO notification to the manager room
    if (io) {
      const notificationData = {
        type: 'sla_breach',
        title: `🚨 SLA Breach: ${timer.entityType.toUpperCase()}`,
        message: `SLA target breached for ${timer.entityType} (${timer.slaType}). Escalated to ${escalatedTo}.`,
        data: {
          escalationId: escalation._id,
          entityType: timer.entityType,
          entityId: timer.entityId
        }
      };

      // Broadcast alert to managers
      io.emit('notification', {
        id: Date.now().toString(),
        type: 'error',
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        timestamp: new Date().toISOString()
      });
    }

    return escalation;
  } catch (error) {
    logger.error('Error in escalateBreach:', error);
    throw error;
  }
}

async function resolveEscalation(escalationId, resolvedBy, note) {
  try {
    const escalation = await Escalation.findById(escalationId);
    if (!escalation) throw new Error('Escalation not found');

    escalation.status = 'resolved';
    escalation.resolvedAt = new Date();
    escalation.resolvedBy = resolvedBy;
    escalation.resolutionNote = note;
    await escalation.save();

    logger.info(`🚨 Escalation ${escalationId} resolved by ${resolvedBy}`);
    return escalation;
  } catch (error) {
    logger.error('Error resolving escalation:', error);
    throw error;
  }
}

module.exports = {
  escalateBreach,
  resolveEscalation
};
