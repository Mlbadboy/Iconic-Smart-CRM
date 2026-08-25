const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiCreativeStudioService = require('../services/aiCreativeStudioService');

// Get AI Studio Config (Brand Profile, Mode, Usage)
router.get('/config', auth, async (req, res) => {
  try {
    const config = await aiCreativeStudioService.getConfig(req.user.companyId);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update AI Config (Mode, Brand Profile, BYOK API Key)
router.post('/config', auth, async (req, res) => {
  try {
    const { mode, brandProfile, byokApiKey, byokProvider, byokModel } = req.body;
    const config = await aiCreativeStudioService.updateConfig(req.user.companyId, {
      mode,
      brandProfile,
      byokApiKey,
      byokProvider,
      byokModel
    });
    res.json({ success: true, config });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Synthesize 5-Tier Prompt & Generate Multi-Channel Creatives
router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt, objective, productName, productCategory, targetFestival } = req.body;
    const creative = await aiCreativeStudioService.generateCreative(
      req.user.companyId,
      req.user._id,
      { prompt, objective, productName, productCategory, targetFestival }
    );
    res.json({ success: true, creative });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Save generated creative to central asset library
router.post('/save-asset', auth, async (req, res) => {
  try {
    const { title, channel, assetType, contentUrl, copyText, metadata } = req.body;
    const asset = await aiCreativeStudioService.saveAsAsset(
      req.user.companyId,
      req.user._id,
      { title, channel, assetType, contentUrl, copyText, metadata }
    );
    res.json({ success: true, asset });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
