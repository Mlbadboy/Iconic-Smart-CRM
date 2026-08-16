const express = require('express');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const ApprovalRequest = require('../models/ApprovalRequest');
const { approveRequest, rejectRequest } = require('../services/approvalService');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

// Get list of approvals (requires manager/admin role)
router.get('/', auth, requirePermission('report.view'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const approvals = await ApprovalRequest.find(filter)
      .populate('requesterId', 'name email role')
      .populate('approverId', 'name email role')
      .sort({ createdAt: -1 });

    return success(res, approvals);
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// Approve a request
router.post('/:id/approve', auth, requirePermission('report.view'), async (req, res) => {
  try {
    const { responseReason } = req.body;
    const approval = await approveRequest(req.params.id, req.user.id, responseReason || 'Approved');
    return success(res, approval);
  } catch (err) {
    return error(res, { status: 400, message: err.message });
  }
});

// Reject a request
router.post('/:id/reject', auth, requirePermission('report.view'), async (req, res) => {
  try {
    const { responseReason } = req.body;
    const approval = await rejectRequest(req.params.id, req.user.id, responseReason || 'Rejected');
    return success(res, approval);
  } catch (err) {
    return error(res, { status: 400, message: err.message });
  }
});

module.exports = router;
