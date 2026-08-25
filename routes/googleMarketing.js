const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const googleMarketingService = require('../services/googleMarketingService');

// Get Google marketing account details & metrics
router.get('/account', auth, async (req, res) => {
  try {
    const account = await googleMarketingService.getAccount(req.user.companyId);
    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Trigger 1-Click Product Feed Sync to Google Merchant Center
router.post('/merchant/sync', auth, async (req, res) => {
  try {
    const merchant = await googleMarketingService.syncMerchantFeed(req.user.companyId);
    res.json({ success: true, merchantCenter: merchant, ...merchant.toObject ? merchant.toObject() : merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
