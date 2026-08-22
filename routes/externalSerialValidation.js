const express = require('express');
const { apiKeyAuth, requirePermission } = require('../middleware/apiKeyAuth');
const { requireFeature } = require('../middleware/featureGate');
const { validateSerialNumber } = require('../services/serialValidationService');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

// Validate a serial number via external API Key credentials
router.post('/validate', apiKeyAuth, requirePermission('serial_validation.validate'), requireFeature('serial_validation'), async (req, res) => {
  try {
    // Extract parameters case-insensitively to tolerate different calling conventions (Salesforce, etc.)
    const getBodyParam = (key) => {
      const target = key.toLowerCase();
      for (const k of Object.keys(req.body || {})) {
        if (k.toLowerCase() === target) {
          return req.body[k];
        }
      }
      return undefined;
    };

    let materialCode = getBodyParam('materialCode');
    let serialNumber = getBodyParam('serialNumber');
    let dealerCode = getBodyParam('dealerCode');

    if (!materialCode || typeof materialCode !== 'string') {
      return res.status(400).json({ 
        valid: false, 
        status: 'INVALID_INPUT', 
        message: 'Material Code is required.',
        responseStatus: '-4',
        responseMessage: 'Invalid Material code',
        responeMessage: 'Invalid Material code'
      });
    }
    if (!serialNumber || typeof serialNumber !== 'string') {
      return res.status(400).json({ 
        valid: false, 
        status: 'INVALID_INPUT', 
        message: 'Serial Number is required.',
        responseStatus: '-1',
        responseMessage: 'Invalid Serial Number',
        responeMessage: 'Invalid Serial Number'
      });
    }
    if (!dealerCode || typeof dealerCode !== 'string') {
      return res.status(400).json({ 
        valid: false, 
        status: 'INVALID_INPUT', 
        message: 'Dealer Code is required.',
        responseStatus: '-5',
        responseMessage: 'Serial Number not billed to this dealer',
        responeMessage: 'Serial Number not billed to this dealer'
      });
    }

    materialCode = materialCode.trim();
    serialNumber = serialNumber.trim();
    dealerCode = dealerCode.trim();

    if (!materialCode || !serialNumber || !dealerCode) {
      return res.status(400).json({ 
        valid: false, 
        verified: false, 
        canProceed: false, 
        status: 'INVALID_INPUT', 
        message: 'All validation fields must contain non-empty text.',
        responseStatus: '-1',
        responseMessage: 'Invalid Serial Number',
        responeMessage: 'Invalid Serial Number'
      });
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
          message: `API key is not authorized for dealer '${dealerCode}'.`,
          // Bajaj Finance specific
          responseStatus: '-5',
          responseMessage: 'Serial Number not billed to this dealer',
          responeMessage: 'Serial Number not billed to this dealer'
        });
      }
    }

    const result = await validateSerialNumber(req, { materialCode, serialNumber, dealerCode });

    const pdfMessages = {
      '0': 'Valid Serial Number',
      '-1': 'Invalid Serial Number',
      '-2': 'Mismatch in model and serial number',
      '-3': 'Serial Number Already Validated',
      '-4': 'Invalid Material code',
      '-5': 'Serial Number not billed to this dealer'
    };
    const responseMsg = pdfMessages[result.statusCode] || result.message;

    return res.status(200).json({
      valid: Boolean(result.verified),
      verified: Boolean(result.verified),
      canProceed: Boolean(result.canProceed),
      resultCode: result.resultCode || result.status,
      status: result.status || result.resultCode,
      statusCode: result.statusCode || (result.verified ? '0' : '-1'),
      message: result.message,
      materialCode,
      serialNumber,
      dealerCode,
      validatedAt: new Date().toISOString(),
      // Bajaj Finance Salesforce specific response fields
      responseStatus: result.statusCode || (result.verified ? '0' : '-1'),
      responseMessage: responseMsg,
      responeMessage: responseMsg
    });
  } catch (err) {
    return res.status(500).json({
      valid: false,
      verified: false,
      canProceed: false,
      resultCode: 'INTERNAL_ERROR',
      status: 'INTERNAL_ERROR',
      message: err.message,
      // Bajaj Finance specific
      responseStatus: '-1',
      responseMessage: 'Invalid Serial Number',
      responeMessage: 'Invalid Serial Number'
    });
  }
});

module.exports = router;
