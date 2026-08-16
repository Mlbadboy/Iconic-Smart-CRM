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
      return res.status(400).json({ valid: false, status: 'INVALID_INPUT', message: 'All validation fields must contain non-empty text.' });
    }

    const result = await validateSerialNumber(req, { materialCode, serialNumber, dealerCode });

    return res.status(200).json({
      valid: result.success,
      status: result.status,
      message: result.message
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
