const express = require('express');
const { apiKeyAuth, requirePermission } = require('../middleware/apiKeyAuth');
const { validateSerialNumber } = require('../services/serialValidationService');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

// Validate a serial number via external API Key credentials
router.post('/validate', apiKeyAuth, requirePermission('serial_validation.validate'), async (req, res) => {
  try {
    let { materialCode, serialNumber, dealerCode } = req.body;

    if (!materialCode || typeof materialCode !== 'string') {
      return res.status(400).json({ valid: false, status: 'INVALID_INPUT', message: 'Material Code is required.' });
    }
    if (!serialNumber || typeof serialNumber !== 'string') {
      return res.status(400).json({ valid: false, status: 'INVALID_INPUT', message: 'Serial Number is required.' });
    }
    if (!dealerCode || typeof dealerCode !== 'string') {
      return res.status(400).json({ valid: false, status: 'INVALID_INPUT', message: 'Dealer Code is required.' });
    }

    materialCode = materialCode.trim();
    serialNumber = serialNumber.trim();
    dealerCode = dealerCode.trim();

    if (!materialCode || !serialNumber || !dealerCode) {
      return res.status(400).json({ valid: false, verified: false, canProceed: false, status: 'INVALID_INPUT', message: 'All validation fields must contain non-empty text.' });
    }

    // Check API Key Dealer Scope Authorization
    if (req.apiKey && req.apiKey.dealerScope && req.apiKey.dealerScope.length > 0) {
      if (!req.apiKey.dealerScope.includes(dealerCode)) {
        return res.status(200).json({
          valid: false,
          verified: false,
          canProceed: false,
          statusCode: '4',
          status: 'DEALER_MISMATCH',
          message: `API key is not authorized for dealer '${dealerCode}'.`
        });
      }
    }

    const result = await validateSerialNumber(req, { materialCode, serialNumber, dealerCode });

    return res.status(200).json({
      valid: result.verified || false,
      verified: result.verified || false,
      canProceed: result.canProceed || false,
      statusCode: result.statusCode || (result.verified ? '0' : '1'),
      status: result.status,
      message: result.message,
      details: result.details || null
    });
  } catch (err) {
    return res.status(500).json({
      valid: false,
      status: 'INTERNAL_ERROR',
      message: err.message
    });
  }
});

module.exports = router;
