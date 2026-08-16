const ApprovalRequest = require('../models/ApprovalRequest');
const logger = require('./logger');

async function createRequest(entityType, entityId, requesterId, type, amount, reason) {
  try {
    const request = new ApprovalRequest({
      entityType,
      entityId,
      requesterId,
      type,
      amount,
      reason,
      status: 'pending'
    });

    await request.save();
    logger.info(`📝 Approval request created for ${entityType} ${entityId} by user ${requesterId}`);
    return request;
  } catch (error) {
    logger.error('Error creating approval request:', error);
    throw error;
  }
}

async function approveRequest(requestId, approverId, responseReason = '') {
  try {
    const request = await ApprovalRequest.findById(requestId);
    if (!request) throw new Error('Approval request not found');
    if (request.status !== 'pending') throw new Error('Approval request is already processed');

    // Segregation of Duties Check: Requester cannot be the Approver
    if (request.requesterId.toString() === approverId.toString()) {
      throw new Error('Segregation of duties: Requesters cannot approve their own requests');
    }

    request.status = 'approved';
    request.approverId = approverId;
    request.responseReason = responseReason;
    await request.save();

    logger.info(`📝 Approval request ${requestId} approved by ${approverId}`);
    return request;
  } catch (error) {
    logger.error('Error approving request:', error);
    throw error;
  }
}

async function rejectRequest(requestId, approverId, responseReason = '') {
  try {
    const request = await ApprovalRequest.findById(requestId);
    if (!request) throw new Error('Approval request not found');
    if (request.status !== 'pending') throw new Error('Approval request is already processed');

    request.status = 'rejected';
    request.approverId = approverId;
    request.responseReason = responseReason;
    await request.save();

    logger.info(`📝 Approval request ${requestId} rejected by ${approverId}`);
    return request;
  } catch (error) {
    logger.error('Error rejecting request:', error);
    throw error;
  }
}

module.exports = {
  createRequest,
  approveRequest,
  rejectRequest
};
