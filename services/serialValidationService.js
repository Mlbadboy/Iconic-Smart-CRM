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
    logger.info(`🔌 Local Registry Validation: materialCode: ${materialCode}, serialNumber: ${maskedSno}, dealerCode: ${dealerCode}`);

    // Exact matching on serialNumber
    const record = await SerialRegistry.findOne({ serialNumber: serialNumber });
    
    let matched = null;
    if (!record) {
      responseStatus = '-1';
      responseMessage = 'Serial number does not exist in master registry';
      matched = mapStatusToResult('-1');
    } else if (record.materialCode.toUpperCase() !== materialCode.toUpperCase()) {
      responseStatus = '-2';
      responseMessage = 'Material code does not match the registered serial number';
      matched = mapStatusToResult('-2');
    } else if (record.dealerCode.toUpperCase() !== dealerCode.toUpperCase()) {
      responseStatus = '-5';
      responseMessage = 'Serial number is not registered to this dealer';
      matched = mapStatusToResult('-5');
    } else if (record.activationStatus && record.activationStatus !== 'ACTIVE') {
      responseStatus = '2';
      responseMessage = `Serial number activation status is ${record.activationStatus.toLowerCase()}`;
      matched = { verified: false, canProceed: false, resultCode: 'EXPIRED', message: responseMessage };
    } else if (record.registrationStatus === 'DEACTIVATED') {
      responseStatus = '2';
      responseMessage = 'Serial number is deactivated in master registry';
      matched = { verified: false, canProceed: false, resultCode: 'EXPIRED', message: responseMessage };
    } else if (record.status === 'VALIDATED') {
      responseStatus = '-3';
      responseMessage = 'Serial Number Already Validated';
      matched = mapStatusToResult('-3');
    } else {
      // Valid! Update status to VALIDATED and record date
      record.status = 'VALIDATED';
      record.registrationDate = new Date();
      await record.save();

      responseStatus = '0';
      responseMessage = 'Serial number validated successfully';
      matched = mapStatusToResult('0');
    }

    latency = Date.now() - startTime;
    validationResult = matched.resultCode;

    // Build standard return object
    const resultObj = {
      success: responseStatus === '0',
      verified: matched.verified,
      canProceed: matched.canProceed,
      statusCode: responseStatus,
      status: matched.resultCode,
      message: responseMessage
    };

    // Save history entry
    const history = new SerialValidationHistory({
      materialCode,
      serialNumber,
      dealerCode,
      responseStatus,
      responseMessage: resultObj.message,
      validationResult,
      validatedBy: req.user ? req.user.id : null,
      requestId: correlationId,
      latency
    });
    await history.save();

    // Record audit event
    await recordAuditEvent(req, {
      action: 'serial.validate',
      entity: 'SerialValidation',
      entityId: history._id,
      newValue: {
        materialCode,
        serialNumber: maskedSno,
        dealerCode,
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
