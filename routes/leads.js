const express = require('express');
const Lead = require('../models/Lead');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create lead
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const { name, email, phone, source } = req.body;
    const leadId = 'LD-' + Date.now();
    const lead = new Lead({ leadId, name, email, phone, source });
    await lead.save();
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all leads (with optional filtering)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const { status, source } = req.query;
    let query = {};
    if (status) query.status = status;
    if (source) query.source = source;
    const leads = await Lead.find(query);
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get lead by ID
router.get('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update lead (full update)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const updates = { ...req.body, updatedAt: Date.now() };
    const lead = await Lead.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update lead status only
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, updatedAt: Date.now() },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete lead
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted successfully', lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
