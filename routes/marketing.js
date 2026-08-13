const express = require('express');
const MarketingAsset = require('../models/MarketingAsset');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create marketing asset
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const { title, imageRef, endDate } = req.body;
    const assetId = 'MKT-' + Date.now();
    const asset = new MarketingAsset({ assetId, title, imageRef, endDate });
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get active assets
router.get('/active', async (req, res) => {
  try {
    const assets = await MarketingAsset.find({ active: true });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Deactivate asset
router.put('/:id/deactivate', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const asset = await MarketingAsset.findOneAndUpdate(
      { assetId: req.params.id },
      { active: false },
      { new: true }
    );
    res.json(asset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
