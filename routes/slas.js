const express = require('express');
const SlaTimer = require('../models/SlaTimer');
const Escalation = require('../models/Escalation');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { resolveEscalation } = require('../services/escalationService');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

// Get active/breached SLA timers
router.get('/timers', auth, requirePermission('report.view'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.entityType) filter.entityType = req.query.entityType;

    const timers = await SlaTimer.find(filter).sort({ targetTime: 1 }).limit(100);
    return success(res, timers);
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// Get active escalations
router.get('/escalations', auth, requirePermission('report.view'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.escalatedTo) filter.escalatedTo = req.query.escalatedTo;

    const escalations = await Escalation.find(filter).sort({ createdAt: -1 }).limit(100);
    return success(res, escalations);
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// Resolve an escalation
router.post('/escalations/:id/resolve', auth, requirePermission('report.view'), async (req, res) => {
  try {
    const { note } = req.body;
    const resolvedBy = req.user.email || req.user.id;
    const escalation = await resolveEscalation(req.params.id, resolvedBy, note || 'Resolved by manager');
    return success(res, escalation);
  } catch (err) {
    return error(res, { status: 400, message: err.message });
  }
});

module.exports = router;
