const express = require('express');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { getRateLimiter } = require('../middleware/rateLimiter');
const { validateSerialNumber, maskSerial } = require('../services/serialValidationService');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const SerialRegistry = require('../models/SerialRegistry');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

// Validate a serial number
router.post('/validate', auth, requirePermission('serial_validation.validate'), getRateLimiter, async (req, res) => {
  try {
    let { materialCode, serialNumber, dealerCode } = req.body;

    if (!materialCode || typeof materialCode !== 'string') {
      return error(res, { status: 400, message: 'Material Code is required.' });
    }
    if (!serialNumber || typeof serialNumber !== 'string') {
      return error(res, { status: 400, message: 'Serial Number is required.' });
    }
    if (!dealerCode || typeof dealerCode !== 'string') {
      return error(res, { status: 400, message: 'Dealer Code is required.' });
    }

    // Trim surrounding whitespace
    materialCode = materialCode.trim();
    serialNumber = serialNumber.trim();
    dealerCode = dealerCode.trim();

    if (!materialCode || !serialNumber || !dealerCode) {
      return error(res, { status: 400, message: 'Invalid payload: All fields must contain non-whitespace text.' });
    }

    const result = await validateSerialNumber(req, { materialCode, serialNumber, dealerCode });
    return success(res, result);
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// View recent validation history
router.get('/history', auth, requirePermission('serial_validation.history'), async (req, res) => {
  try {
    const history = await SerialValidationHistory.find()
      .populate('validatedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    // Mask serial numbers before returning them to the UI
    const maskedHistory = history.map(item => {
      const obj = item.toObject();
      obj.serialNumber = maskSerial(obj.serialNumber);
      return obj;
    });

    return success(res, maskedHistory);
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

// Bulk import serial master data
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

    const validRecords = [];
    for (const rec of records) {
      if (!rec.materialCode || !rec.serialNumber || !rec.dealerCode) {
        return error(res, {
          status: 400,
          message: `Missing required field (materialCode, serialNumber, dealerCode) in row: ${JSON.stringify(rec)}`
        });
      }
      validRecords.push({
        materialCode: rec.materialCode.trim(),
        serialNumber: rec.serialNumber.trim(),
        dealerCode: rec.dealerCode.trim(),
        customer: rec.customer ? rec.customer.trim() : '',
        status: 'ACTIVE',
        uploadedBy: req.user.id
      });
    }

    let insertedCount = 0;
    for (const rec of validRecords) {
      await SerialRegistry.updateOne(
        { serialNumber: rec.serialNumber },
        { $set: rec },
        { upsert: true }
      );
      insertedCount++;
    }

    return success(res, {
      message: `Successfully imported ${insertedCount} serial registry records.`,
      count: insertedCount
    });
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

module.exports = router;
