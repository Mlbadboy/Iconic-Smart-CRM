const express = require('express');
const Opportunity = require('../models/Opportunity');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const { assertTransition } = require('../services/workflowService');

const router = express.Router();

router.post('/', auth, requirePermission('opportunity.create'), async (req, res) => {
  try {
    const { name, value, leadId, assignedTo, expectedCloseDate } = req.body;
    const opportunity = new Opportunity({ opportunityId: 'OPP-' + Date.now(), name, value, leadId, assignedTo, expectedCloseDate });
    await opportunity.save();
    await recordAuditEvent(req, { action: 'opportunity.create', entity: 'Opportunity', entityId: opportunity._id, newValue: opportunity.toObject() });
    res.status(201).json(opportunity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', auth, requirePermission('opportunity.view'), async (req, res) => {
  try {
    const opportunities = await Opportunity.find().populate('leadId');
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/stage', auth, requirePermission('opportunity.edit'), async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({ opportunityId: req.params.id });
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
    const previousStage = opportunity.stage;
    assertTransition('opportunity', previousStage, req.body.stage);
    opportunity.stage = req.body.stage;
    opportunity.updatedAt = Date.now();
    await opportunity.save();
    await recordAuditEvent(req, { action: 'opportunity.stage.update', entity: 'Opportunity', entityId: opportunity._id, previousValue: { stage: previousStage }, newValue: { stage: opportunity.stage } });
    res.json(opportunity);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message, code: err.code });
  }
});

module.exports = router;
