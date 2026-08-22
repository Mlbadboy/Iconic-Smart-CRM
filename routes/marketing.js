const express = require('express');
const MarketingAsset = require('../models/MarketingAsset');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();
router.use(requireFeature('marketing'));

router.post('/', auth, requirePermission('marketing.create'), async (req, res) => {
  try {
    const { title, imageRef, endDate } = req.body;
    const asset = new MarketingAsset({ assetId: 'MKT-' + Date.now(), title, imageRef, endDate });
    await asset.save();
    await recordAuditEvent(req, { action: 'marketing.create', entity: 'MarketingAsset', entityId: asset._id, newValue: asset.toObject() });
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/active', auth, requirePermission('marketing.view'), async (req, res) => {
  try {
    const assets = await MarketingAsset.find({ active: true }).limit(50).sort({ startDate: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/deactivate', auth, requirePermission('marketing.launch'), async (req, res) => {
  try {
    const asset = await MarketingAsset.findOneAndUpdate(
      { assetId: req.params.id },
      { active: false },
      { new: true }
    );
    if (!asset) return res.status(404).json({ message: 'Marketing asset not found' });
    await recordAuditEvent(req, { action: 'marketing.deactivate', entity: 'MarketingAsset', entityId: asset._id, newValue: { active: false } });
    res.json(asset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
