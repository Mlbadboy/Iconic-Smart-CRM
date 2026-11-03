const axios = require('axios');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const SerialRegistry = require('../models/SerialRegistry');
const { recordAuditEvent } = require('./auditService');
const logger = require('./logger');

function maskSerial(serial) {
  if (!serial) return '';
  if (serial.length <= 4) return '*'.repeat(serial.length);
  return '*'.repeat(serial.length - 4) + serial.slice(-4);
}

function mapStatusToResult(responseStatus) {
  const statusStr = String(responseStatus).trim();
  switch (statusStr) {
    case '0':
      return {
        verified: true,
        canProceed: true,
        resultCode: 'VALID',
        message: 'Valid Serial Number'
      };
    case '-1':
      return {
        verified: false,
        canProceed: false,
        resultCode: 'INVALID_SERIAL',
        message: 'Invalid Serial Number'
      };
    case '-2':
      return {
        verified: false,
        canProceed: false,
        resultCode: 'MODEL_SERIAL_MISMATCH',
        message: 'Mismatch in model and serial number'
      };
    case '-3':
      return {
        verified: false,
        canProceed: false,
        alreadyValidated: true,
        resultCode: 'ALREADY_VALIDATED',
        message: 'Serial Number Already Validated'
      };
    case '-4':
      return {
        verified: false,
        canProceed: false,
        resultCode: 'INVALID_MATERIAL_CODE',
        message: 'Invalid Material code'
      };
    case '-5':
      return {
        verified: false,
        canProceed: false,
        resultCode: 'DEALER_MISMATCH',
        message: 'Serial Number not billed to this dealer'
      };
    default:
      return {
        verified: false,
        canProceed: false,
        resultCode: 'UNKNOWN_RESPONSE',
        message: 'Unable to determine validation status. Please contact the administrator or try again.'
      };
  }
}

async function validateSerialNumber(req, { materialCode, serialNumber, dealerCode }) {
  const startTime = Date.now();
  const correlationId = req.correlationId || '';
  const maskedSno = maskSerial(serialNumber);

  let responseStatus = '';
  let responseMessage = '';
  let validationResult = '';
  let latency = 0;

  try {
    const companyId = req.companyId || req.user?.companyId;

    let previousStatus = null;
    let currentStatus = null;
    let statusChanged = false;
    let statusChangeRemark = '';

    // Authoritative tenant-scoped master registry check (with company + unassigned fallback)
    const cleanSerial = serialNumber.trim();
    const query = {
      serialNumber: new RegExp(`^${cleanSerial}$`, 'i')
    };
    if (companyId && req.user?.role !== 'superadmin') {
      query.$or = [{ companyId }, { companyId: null }, { companyId: { $exists: false } }];
    }
    const record = await SerialRegistry.findOne(query).populate('productId');

    if (record) {
      previousStatus = record.status || 'IN_STOCK';
      currentStatus = record.status || 'IN_STOCK';

      const inputMat = (materialCode || '').trim().toUpperCase();
      const recMat = (record.materialCode || '').trim().toUpperCase();
      const prodSku = (record.productId?.sku || '').trim().toUpperCase();
      const prodCode = (record.productId?.productCode || '').trim().toUpperCase();
      const prodMat = (record.productId?.materialCode || '').trim().toUpperCase();
      const prodModel = (record.productId?.model || '').trim().toUpperCase();

      // If user provided a material code, check for exact match against registered model/materials
      const matMatches = !inputMat || (
        recMat === inputMat ||
        prodSku === inputMat ||
        prodCode === inputMat ||
        prodMat === inputMat ||
        prodModel === inputMat
      );

      // If user provided a dealer code, check for exact match against registered dealer
      const inputDealer = (dealerCode || '').trim().toUpperCase();
      const recDealer = (record.dealerCode || '').trim().toUpperCase();
      const dealerMatches = !inputDealer || !recDealer || recDealer === inputDealer;

      if (!matMatches) {
        responseStatus = '-2';
        responseMessage = `Material code mismatch: Entered "${materialCode}" does not match registered model/material "${record.materialCode}"`;
        matched = mapStatusToResult('-2');
        statusChangeRemark = `Status unchanged: ${currentStatus} (Material mismatch)`;
      } else if (!dealerMatches) {
        responseStatus = '-5';
        responseMessage = `Dealer code mismatch: Entered "${dealerCode}" does not match registered dealer "${record.dealerCode || 'None'}"`;
        matched = mapStatusToResult('-5');
        statusChangeRemark = `Status unchanged: ${currentStatus} (Dealer mismatch)`;
      } else if (record.activationStatus && record.activationStatus !== 'ACTIVE') {
        responseStatus = '2';
        responseMessage = `Serial number activation status is ${record.activationStatus.toLowerCase()}`;
        matched = { verified: false, canProceed: false, resultCode: 'EXPIRED', message: responseMessage };
        statusChangeRemark = `Status unchanged: ${currentStatus} (Activation: ${record.activationStatus})`;
      } else if (record.registrationStatus === 'DEACTIVATED') {
        responseStatus = '2';
        responseMessage = 'Serial number is deactivated in master registry';
        matched = { verified: false, canProceed: false, resultCode: 'EXPIRED', message: responseMessage };
        statusChangeRemark = `Status unchanged: ${currentStatus} (Deactivated)`;
      } else if (record.status === 'VALIDATED') {
        responseStatus = '-3';
        responseMessage = 'Serial Number Already Validated';
        matched = mapStatusToResult('-3');
        statusChangeRemark = 'Status unchanged: Already VALIDATED';
      } else if (record.status === 'SOLD') {
        responseStatus = '-3';
        responseMessage = 'Serial Number is marked as SOLD in master registry';
        matched = { verified: false, canProceed: false, alreadyValidated: true, resultCode: 'ALREADY_VALIDATED', message: responseMessage };
        statusChangeRemark = 'Status unchanged: Already SOLD';
      } else if (record.status === 'DEFECTIVE') {
        responseStatus = '-6';
        responseMessage = 'Serial Number is marked as DEFECTIVE in master registry';
        matched = { verified: false, canProceed: false, resultCode: 'DEFECTIVE', message: responseMessage };
        statusChangeRemark = 'Status unchanged: DEFECTIVE';
      } else {
        // Valid! Update status to VALIDATED and record date
        if (record.status !== 'VALIDATED') {
          statusChanged = true;
          record.status = 'VALIDATED';
          record.registrationDate = new Date();
          await record.save();
          currentStatus = 'VALIDATED';
          statusChangeRemark = `Status updated from ${previousStatus} to VALIDATED`;
        } else {
          currentStatus = 'VALIDATED';
          statusChangeRemark = 'Status unchanged: Already VALIDATED';
        }

        responseStatus = '0';
        responseMessage = 'Valid Serial Number';
        matched = mapStatusToResult('0');
      }
    } else if (process.env.SERIAL_VALIDATION_ACCESS_KEY && !companyId) {
      // Call upstream external validation gateway if configured
      const apiUrl = process.env.SERIAL_VALIDATION_URL || 'https://crm.iconicsmart.co.in/api/validatesno.asp';
      const timeoutMs = parseInt(process.env.SERIAL_VALIDATION_TIMEOUT || '5000', 10);

      const postData = {
        accessKey: process.env.SERIAL_VALIDATION_ACCESS_KEY,
        materialCode,
        serialNumber,
        dealerCode
      };

      try {
        const response = await axios.post(apiUrl, postData, {
          timeout: timeoutMs,
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response || !response.data || typeof response.data !== 'object' || response.data.responseStatus === undefined) {
          responseStatus = '503';
          responseMessage = 'Malformed response from external serial validation gateway';
          matched = {
            verified: false,
            canProceed: false,
            resultCode: 'SERVICE_UNAVAILABLE',
            message: responseMessage
          };
        } else {
          responseStatus = String(response.data.responseStatus);
          responseMessage = response.data.responseMessage || '';
          matched = mapStatusToResult(responseStatus);
        }
      } catch (upstreamErr) {
        responseStatus = '503';
        responseMessage = 'Upstream validation gateway unavailable';
        matched = {
          verified: false,
          canProceed: false,
          resultCode: 'SERVICE_UNAVAILABLE',
          message: responseMessage
        };
      }
    } else {
      previousStatus = null;
      currentStatus = 'NOT_FOUND';
      statusChanged = false;
      statusChangeRemark = 'Serial number does not exist in master registry';
      responseStatus = '-1';
      responseMessage = 'Serial number does not exist in master registry';
      matched = mapStatusToResult('-1');
    }

    latency = Date.now() - startTime;
    validationResult = matched.resultCode;

    // Build standard return object with rich diagnostic details and status change tracking
    const resultObj = {
      success: responseStatus === '0',
      verified: matched.verified,
      canProceed: matched.canProceed,
      alreadyValidated: matched.alreadyValidated || false,
      statusCode: responseStatus,
      status: matched.resultCode,
      resultCode: matched.resultCode,
      message: responseMessage,
      statusChanged: Boolean(statusChanged),
      previousStatus: previousStatus || null,
      currentStatus: currentStatus || null,
      statusChangeRemark: statusChangeRemark || null,
      details: {
        enteredSerialNumber: serialNumber,
        enteredMaterialCode: materialCode || null,
        enteredDealerCode: dealerCode || null,
        registeredSerialNumber: record ? record.serialNumber : null,
        registeredMaterialCode: record ? record.materialCode : null,
        registeredModel: record?.productId?.model || record?.materialCode || null,
        registeredProductName: record?.productId?.name || null,
        registeredDealerCode: record ? record.dealerCode : null,
        registeredStatus: currentStatus || (record ? record.status : 'NOT_FOUND'),
        previousStatus: previousStatus || null,
        currentStatus: currentStatus || null,
        statusChanged: Boolean(statusChanged),
        statusChangeRemark: statusChangeRemark || null,
        registeredCustomer: record ? record.customer : null,
        rejectionReason: responseStatus !== '0' ? responseMessage : null,
        remark: responseMessage
      }
    };

    // If status changed, trigger webhooks for external subscribers
    if (statusChanged && record) {
      try {
        const WebhookService = require('./webhookService');
        WebhookService.triggerWebhooks('serial.status.update', {
          serialNumber: record.serialNumber,
          materialCode: record.materialCode,
          dealerCode: record.dealerCode,
          previousStatus,
          currentStatus,
          statusChanged: true,
          statusChangeRemark,
          validatedBy: req.user ? req.user.id : (req.apiKey ? req.apiKey.userId : 'API'),
          clientName: req.apiKey ? (req.apiKey.clientName || req.apiKey.name) : (req.user?.name || 'Portal User'),
          timestamp: new Date().toISOString()
        }).catch(err => logger.warn(`Webhook dispatch warning: ${err.message}`));
      } catch (wErr) {
        // Non-blocking
      }
    }

    const serialHash = require('crypto').createHash('sha256').update(String(serialNumber).trim().toUpperCase()).digest('hex');

    // Save history entry with status change tracking
    const history = new SerialValidationHistory({
      companyId: companyId || null,
      materialCode: materialCode || (record ? record.materialCode : 'N/A'),
      serialNumber,
      maskedSerial: maskedSno,
      serialHash,
      dealerCode: dealerCode || (record ? record.dealerCode : 'N/A'),
      previousStatus: previousStatus || 'N/A',
      currentStatus: currentStatus || 'N/A',
      statusChanged: Boolean(statusChanged),
      statusChangeRemark: statusChangeRemark || '',
      responseStatus,
      responseMessage: resultObj.message,
      validationResult,
      clientName: req.apiKey ? (req.apiKey.clientName || req.apiKey.name) : (req.user?.name || 'Portal User'),
      feature: req.apiKey ? (req.apiKey.feature || 'Serial Number Validation') : 'Serial Number Validation',
      validatedBy: req.user ? req.user.id : (req.apiKey ? req.apiKey.userId : null),
      apiKeyId: req.apiKey ? req.apiKey.id || req.apiKey._id : null,
      requestId: correlationId,
      latency
    });
    await history.save();

    // Record audit event with status change history
    await recordAuditEvent(req, {
      action: 'serial.validate',
      entity: 'SerialValidation',
      entityId: history._id,
      previousValue: {
        status: previousStatus
      },
      newValue: {
        materialCode,
        serialNumber: maskedSno,
        dealerCode,
        status: currentStatus,
        statusChanged: Boolean(statusChanged),
        statusChangeRemark,
        responseStatus,
        validationResult,
        latency
      }
    });

    logger.info(`🔌 Validation result for serial ${maskedSno}: ${validationResult} (Latency: ${latency}ms)`);
    return resultObj;

  } catch (err) {
    latency = Date.now() - startTime;
    logger.error(`🔌 Validation service error for serial ${maskedSno}: ${err.message}`);

    const resultObj = {
      success: false,
      verified: false,
      canProceed: false,
      status: 'SERVICE_UNAVAILABLE',
      message: 'Serial validation service encountered an internal database error.'
    };

    // Save history entry for the failure
    const history = new SerialValidationHistory({
      materialCode,
      serialNumber,
      dealerCode,
      responseStatus: 'error',
      responseMessage: err.message,
      validationResult: 'SERVICE_UNAVAILABLE',
      validatedBy: req.user ? req.user.id : null,
      requestId: correlationId,
      latency
    });
    await history.save();

    return resultObj;
  }
}

module.exports = {
  validateSerialNumber,
  maskSerial
};
