const express = require('express');
const Lead = require('../models/Lead');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const { assertTransition } = require('../services/workflowService');
const { parseListOptions, pagination } = require('../utils/queryOptions');

const router = express.Router();

router.post('/', auth, requirePermission('lead.create'), async (req, res) => {
  try {
    const { name, email, phone, source } = req.body;
    const lead = new Lead({ leadId: 'LD-' + Date.now(), name, email, phone, source });
    await lead.save();
    await recordAuditEvent(req, { action: 'lead.create', entity: 'Lead', entityId: lead._id, newValue: lead.toObject() });
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', auth, requirePermission('lead.view'), async (req, res) => {
  try {
    const { status, source, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (source) query.source = source;
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') }
    ];
    const options = parseListOptions(req.query, ['createdAt', 'updatedAt', 'status', 'source']);
    const [leads, total] = await Promise.all([
      Lead.find(query).sort(options.sort).skip(options.skip).limit(options.limit),
      Lead.countDocuments(query)
    ]);
    res.json({ success: true, data: leads, pagination: pagination(options.page, options.pageSize, total) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, requirePermission('lead.view'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requirePermission('lead.edit'), async (req, res) => {
  try {
    const existing = await Lead.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Lead not found' });
    const updates = { ...req.body, updatedAt: Date.now() };
    delete updates.status;
    const lead = await Lead.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    await recordAuditEvent(req, { action: 'lead.update', entity: 'Lead', entityId: lead._id, previousValue: existing.toObject(), newValue: lead.toObject() });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/status', auth, requirePermission('lead.edit'), async (req, res) => {
  try {
    const existing = await Lead.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Lead not found' });
    const previousStatus = existing.status;
    assertTransition('lead', previousStatus, req.body.status);
    existing.status = req.body.status;
    existing.updatedAt = Date.now();
    await existing.save();
    await recordAuditEvent(req, { action: 'lead.status.update', entity: 'Lead', entityId: existing._id, previousValue: { status: previousStatus }, newValue: { status: existing.status } });
    res.json(existing);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message, code: err.code });
  }
});

router.delete('/:id', auth, requirePermission('lead.approve'), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    await recordAuditEvent(req, { action: 'lead.delete', entity: 'Lead', entityId: lead._id, previousValue: lead.toObject() });
    res.json({ message: 'Lead deleted successfully', lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
