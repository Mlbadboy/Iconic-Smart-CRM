const express = require('express');
const Opportunity = require('../models/Opportunity');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create opportunity
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const { name, value, leadId, assignedTo, expectedCloseDate } = req.body;
    const opportunityId = 'OPP-' + Date.now();
    const opportunity = new Opportunity({ opportunityId, name, value, leadId, assignedTo, expectedCloseDate });
    await opportunity.save();
    res.status(201).json(opportunity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all opportunities
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const opportunities = await Opportunity.find().populate('leadId');
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update opportunity stage
router.put('/:id/stage', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const opportunity = await Opportunity.findOneAndUpdate(
      { opportunityId: req.params.id },
      { stage: req.body.stage, updatedAt: Date.now() },
      { new: true }
    );
    res.json(opportunity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
