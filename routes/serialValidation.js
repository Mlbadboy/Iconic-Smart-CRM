const express = require('express');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { getRateLimiter } = require('../middleware/rateLimiter');
const { validateSerialNumber, maskSerial } = require('../services/serialValidationService');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const SerialRegistry = require('../models/SerialRegistry');
const { success, error } = require('../utils/apiResponse');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();
router.use(requireFeature('serial_validation'));

// Validate a serial number
router.post('/validate', auth, requirePermission('serial_validation.validate'), getRateLimiter, async (req, res) => {
  try {
    let { materialCode, serialNumber, dealerCode } = req.body;

    if (!serialNumber || typeof serialNumber !== 'string' || !serialNumber.trim()) {
      return error(res, { status: 400, message: 'Serial Number is required.' });
    }

    // Trim surrounding whitespace
    serialNumber = serialNumber.trim();
    materialCode = typeof materialCode === 'string' ? materialCode.trim() : '';
    dealerCode = typeof dealerCode === 'string' ? dealerCode.trim() : '';

    if (!req.companyId && req.user?.companyId) {
      req.companyId = req.user.companyId;
    }

    const result = await validateSerialNumber(req, { materialCode, serialNumber, dealerCode });
    return success(res, result);
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// View recent validation history (Scoped by Tenant with Full Search, Result & Status Filters, Live Status Enrichment)
router.get('/history', auth, requirePermission('serial_validation.history'), async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const filter = {};
    const andConditions = [];

    const baseCompanyFilter = (companyId && req.user?.role !== 'superadmin')
      ? { $or: [{ companyId }, { companyId: null }, { companyId: { $exists: false } }] }
      : {};

    if (companyId && req.user?.role !== 'superadmin') {
      andConditions.push(baseCompanyFilter);
    }

    // Filter by Result: VALID, REJECTED, READY, STATUS_UPDATE
    const resultParam = String(req.query.result || req.query.validationResult || '').trim().toUpperCase();
    if (resultParam && resultParam !== 'ALL') {
      if (resultParam === 'REJECTED') {
        andConditions.push({
          $or: [
            { validationResult: 'REJECTED' },
            { responseStatus: { $nin: ['0', 0] } },
            { validationResult: { $in: ['INVALID_SERIAL', 'MODEL_SERIAL_MISMATCH', 'ALREADY_VALIDATED', 'INVALID_MATERIAL_CODE', 'DEALER_MISMATCH', 'EXPIRED', 'DEFECTIVE', 'SERVICE_ERROR', 'SERVICE_UNAVAILABLE', 'UNKNOWN', 'UNKNOWN_RESPONSE'] } }
          ]
        });
      } else if (resultParam === 'VALID') {
        andConditions.push({
          $or: [
            { validationResult: 'VALID' },
            { responseStatus: '0' }
          ]
        });
      } else {
        andConditions.push({ validationResult: resultParam });
      }
    }

    // Filter by Status: IN_STOCK, VALIDATED, SOLD, DEFECTIVE
    const statusParam = String(req.query.status || req.query.currentStatus || '').trim().toUpperCase();
    if (statusParam && statusParam !== 'ALL') {
      andConditions.push({ currentStatus: statusParam });
    }

    const search = String(req.query.search || req.query.q || '').trim();
    if (search) {
      const escaped = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const safeRegex = new RegExp(escaped, 'i');
      andConditions.push({
        $or: [
          { serialNumber: safeRegex },
          { materialCode: safeRegex },
          { dealerCode: safeRegex },
          { responseMessage: safeRegex },
          { statusChangeRemark: safeRegex },
          { currentStatus: safeRegex },
          { validationResult: safeRegex }
        ]
      });
    }

    if (andConditions.length === 1) {
      Object.assign(filter, andConditions[0]);
    } else if (andConditions.length > 1) {
      filter.$and = andConditions;
    }

    const history = await SerialValidationHistory.find(filter)
      .populate('validatedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Attach current live registry status for each serial in the history list
    const serialNumbers = [...new Set(history.map(h => h.serialNumber).filter(Boolean))];
    if (serialNumbers.length > 0) {
      const regQuery = { serialNumber: { $in: serialNumbers } };
      if (companyId && req.user?.role !== 'superadmin') {
        regQuery.$or = [{ companyId }, { companyId: null }, { companyId: { $exists: false } }];
      }
      const liveUnits = await SerialRegistry.find(regQuery, 'serialNumber status materialCode dealerCode').lean();
      const statusMap = {};
      liveUnits.forEach(u => {
        if (u.serialNumber) {
          statusMap[u.serialNumber.trim().toUpperCase()] = u.status || 'IN_STOCK';
        }
      });
      history.forEach(h => {
        if (h.serialNumber) {
          const liveStatus = statusMap[h.serialNumber.trim().toUpperCase()];
          if (liveStatus) {
            h.currentRegistryStatus = liveStatus;
            h.isReadyToValidate = (liveStatus === 'IN_STOCK' || liveStatus === 'REGISTERED' || liveStatus === 'READY');
          }
        }
      });
    }

    return success(res, { history });
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// CSV parser helper
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma while respecting potential quotes if needed, or simple split
    const values = line.split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx];
    });
    records.push(obj);
  }
  return records;
}

// Bulk import CSV preview endpoint (Validation & Preview before Commit)
router.post('/import-preview', auth, requirePermission('serial_validation.import'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return error(res, { status: 400, message: 'csvData text string is required.' });
    }

    const rawRecords = parseCSV(csvData);
    if (rawRecords.length === 0) {
      return error(res, { status: 400, message: 'No valid data rows found in CSV.' });
    }

    const totalRows = rawRecords.length;
    let validRows = 0;
    let invalidRows = 0;
    const errors = [];
    const validRecords = [];
    const seenSerials = new Set();
    let internalDuplicates = 0;

    for (let idx = 0; idx < rawRecords.length; idx++) {
      const rec = rawRecords[idx];
      const rowNum = idx + 2; // Line index (1-based header)

      const materialCode = rec.materialCode ? rec.materialCode.trim() : '';
      const serialNumber = rec.serialNumber ? rec.serialNumber.trim() : '';
      const dealerCode = rec.dealerCode ? rec.dealerCode.trim() : '';

      if (!materialCode || !serialNumber || !dealerCode) {
        invalidRows++;
        errors.push({ row: rowNum, message: 'Missing required field (materialCode, serialNumber, dealerCode)' });
        continue;
      }

      if (seenSerials.has(serialNumber)) {
        internalDuplicates++;
        invalidRows++;
        errors.push({ row: rowNum, message: `Duplicate serial number '${serialNumber}' in file` });
        continue;
      }
      seenSerials.add(serialNumber);

      validRows++;
      validRecords.push({ row: rowNum, materialCode, serialNumber, dealerCode, customer: rec.customer || '' });
    }

    // Check existing records in DB to calculate new vs updates
    const serialList = validRecords.map(r => r.serialNumber);
    const existingRecords = await SerialRegistry.find({ serialNumber: { $in: serialList } }).lean();
    const existingMap = new Map(existingRecords.map(item => [item.serialNumber, item]));

    let newCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    for (const rec of validRecords) {
      const existing = existingMap.get(rec.serialNumber);
      if (!existing) {
        newCount++;
      } else if (existing.materialCode !== rec.materialCode || existing.dealerCode !== rec.dealerCode) {
        updateCount++;
      } else {
        unchangedCount++;
      }
    }

    return success(res, {
      summary: {
        totalRows,
        validRows,
        invalidRows,
        internalDuplicates,
        newCount,
        updateCount,
        unchangedCount
      },
      errors: errors.slice(0, 50), // Return top 50 errors if any
      canCommit: validRows > 0
    });
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// Bulk import serial master data commit
router.post('/import', auth, requirePermission('serial_validation.import'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return error(res, { status: 400, message: 'csvData text string is required.' });
    }

    const records = parseCSV(csvData);
    if (records.length === 0) {
      return error(res, { status: 400, message: 'No valid rows found in CSV data.' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let rejectedCount = 0;
    const errors = [];

    const importSessionId = 'IMP-' + Date.now();

    for (let idx = 0; idx < records.length; idx++) {
      const rec = records[idx];
      const rowNum = idx + 2;

      if (!rec.materialCode || !rec.serialNumber || !rec.dealerCode) {
        rejectedCount++;
        errors.push({ row: rowNum, message: 'Missing materialCode, serialNumber, or dealerCode' });
        continue;
      }

      const materialCode = rec.materialCode.trim();
      const serialNumber = rec.serialNumber.trim();
      const dealerCode = rec.dealerCode.trim();
      const customer = rec.customer ? rec.customer.trim() : '';

      const existingRecord = await SerialRegistry.findOne({ serialNumber });

      if (!existingRecord) {
        // Create new record
        const newRecord = new SerialRegistry({
          materialCode,
          serialNumber,
          dealerCode,
          customer,
          status: 'ACTIVE',
          registrationStatus: 'REGISTERED',
          activationStatus: 'ACTIVE',
          uploadedBy: req.user.id,
          ownershipHistory: [{
            dealerCode,
            assignedAt: new Date(),
            changedBy: req.user.id,
            reason: `Initial import (Session: ${importSessionId})`
          }]
        });
        await newRecord.save();
        insertedCount++;
      } else {
        // Record exists - check if dealerCode changed to log ownership history
        let isChanged = false;
        if (existingRecord.dealerCode !== dealerCode) {
          existingRecord.ownershipHistory.push({
            dealerCode: dealerCode,
            assignedAt: new Date(),
            changedBy: req.user.id,
            reason: `Dealer transfer via CSV import (Session: ${importSessionId})`
          });
          existingRecord.dealerCode = dealerCode;
          isChanged = true;
        }

        if (existingRecord.materialCode !== materialCode) {
          existingRecord.materialCode = materialCode;
          isChanged = true;
        }

        if (customer && existingRecord.customer !== customer) {
          existingRecord.customer = customer;
          isChanged = true;
        }

        if (isChanged) {
          existingRecord.uploadedBy = req.user.id;
          await existingRecord.save();
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }

    return success(res, {
      message: `Import processed: ${insertedCount} created, ${updatedCount} updated, ${unchangedCount} unchanged, ${rejectedCount} rejected.`,
      stats: {
        totalProcessed: records.length,
        insertedCount,
        updatedCount,
        unchangedCount,
        rejectedCount,
        importSessionId
      },
      errors: errors.slice(0, 50)
    });
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

module.exports = router;
