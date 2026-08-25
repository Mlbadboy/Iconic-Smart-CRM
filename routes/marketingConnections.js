const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const marketingConnectionService = require('../services/marketingConnectionService');

// Get all connection statuses for the authenticated company
router.get('/', auth, async (req, res) => {
  try {
    const connections = await marketingConnectionService.getTenantConnections(req.user.companyId);
    res.json({ success: true, connections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Connect or update a provider
router.post('/connect', auth, async (req, res) => {
  try {
    const { provider, displayName, accountId, tokenOrKey, metadata } = req.body;
    const connection = await marketingConnectionService.connectProvider(
      req.user.companyId,
      req.user._id,
      provider,
      { displayName, accountId, tokenOrKey, metadata }
    );
    res.json({ success: true, connection });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Run live diagnostic tests for a provider
router.post('/diagnostics/:provider', auth, async (req, res) => {
  try {
    const result = await marketingConnectionService.runDiagnostic(req.user.companyId, req.params.provider);
    res.json({ success: true, diagnostic: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Disconnect a provider
router.post('/disconnect/:provider', auth, async (req, res) => {
  try {
    const conn = await marketingConnectionService.disconnectProvider(req.user.companyId, req.params.provider);
    res.json({ success: true, connection: conn });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
