const express = require('express');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const SerialRegistry = require('../models/SerialRegistry');
const ImportSession = require('../models/ImportSession');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
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

// 1. Bulk CSV Import Preview (Creates Locked Import Session)
router.post('/import/preview', auth, requirePermission('serial_validation.import'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return error(res, { status: 400, message: 'csvData text string is required.' });
    }

    const rawRecords = parseCSV(csvData);
    if (rawRecords.length === 0) {
      return error(res, { status: 400, message: 'No valid rows found in CSV data.' });
    }

    const fileHash = crypto.createHash('sha256').update(csvData).digest('hex');
    const sessionId = 'IMP-SESS-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

    const totalRows = rawRecords.length;
    let validRows = 0;
    let invalidRows = 0;
    const errors = [];
    const validRecords = [];
    const seenSerials = new Set();
    let internalDuplicates = 0;

    for (let idx = 0; idx < rawRecords.length; idx++) {
      const rec = rawRecords[idx];
      const rowNum = idx + 2;

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
      validRecords.push({
        rowNumber: rowNum,
        materialCode,
        serialNumber,
        dealerCode,
        customer: rec.customer ? rec.customer.trim() : ''
      });
    }

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

    const summary = {
      totalRows,
      validRows,
      invalidRows,
      internalDuplicates,
      newCount,
      updateCount,
      unchangedCount
    };

    // Save locked import session in DB (TTL 30 mins)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const sessionDoc = new ImportSession({
      sessionId,
      fileHash,
      records: validRecords,
      summary,
      status: 'PREVIEWED',
      createdBy: req.user.id,
      expiresAt
    });
    await sessionDoc.save();

    return success(res, {
      importSessionId: sessionId,
      fileHash,
      summary,
      expiresAt,
      errors: errors.slice(0, 50),
      canCommit: validRows > 0
    });
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

// 2. Bulk CSV Import Commit (TOCTOU Session Lock Enforcement)
router.post('/import/commit', auth, requirePermission('serial_validation.import'), async (req, res) => {
  try {
    const { importSessionId, fileHash } = req.body;
    if (!importSessionId || typeof importSessionId !== 'string') {
      return error(res, { status: 400, message: 'importSessionId is required to commit import.' });
    }

    const session = await ImportSession.findOne({ sessionId: importSessionId, status: 'PREVIEWED' });
    if (!session) {
      return error(res, { status: 404, message: `Import session '${importSessionId}' not found or already committed.` });
    }

    if (new Date() > session.expiresAt) {
      session.status = 'EXPIRED';
      await session.save();
      return error(res, { status: 410, message: 'Import session has expired. Please re-run CSV preview.' });
    }

    if (fileHash && fileHash !== session.fileHash) {
      return error(res, { status: 400, message: 'File hash mismatch. The CSV content does not match the approved preview session.' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const rec of session.records) {
      const existingRecord = await SerialRegistry.findOne({ serialNumber: rec.serialNumber });

      if (!existingRecord) {
        const newRecord = new SerialRegistry({
          materialCode: rec.materialCode,
          serialNumber: rec.serialNumber,
          dealerCode: rec.dealerCode,
          customer: rec.customer || '',
          status: 'ACTIVE',
          registrationStatus: 'REGISTERED',
          activationStatus: 'ACTIVE',
          uploadedBy: req.user.id,
          ownershipHistory: [{
            dealerCode: rec.dealerCode,
            customerName: rec.customer || '',
            source: 'CSV_IMPORT',
            importSessionId: session.sessionId,
            assignedAt: new Date(),
            changedBy: req.user.id,
            reason: `Initial creation via Import Session ${session.sessionId}`
          }]
        });
        await newRecord.save();
        insertedCount++;
      } else {
        let isChanged = false;
        if (existingRecord.dealerCode !== rec.dealerCode) {
          existingRecord.ownershipHistory.push({
            dealerCode: rec.dealerCode,
            customerName: rec.customer || existingRecord.customer,
            source: 'CSV_IMPORT',
            importSessionId: session.sessionId,
            assignedAt: new Date(),
            changedBy: req.user.id,
            reason: `Dealer transfer via Import Session ${session.sessionId}`
          });
          existingRecord.dealerCode = rec.dealerCode;
          isChanged = true;
        }

        if (existingRecord.materialCode !== rec.materialCode) {
          existingRecord.materialCode = rec.materialCode;
          isChanged = true;
        }

        if (rec.customer && existingRecord.customer !== rec.customer) {
          existingRecord.customer = rec.customer;
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

    session.status = 'COMMITTED';
    session.committedBy = req.user.id;
    session.committedAt = new Date();
    await session.save();

    return success(res, {
      message: `Successfully committed import session ${session.sessionId}.`,
      stats: {
        importSessionId: session.sessionId,
        insertedCount,
        updatedCount,
        unchangedCount,
        totalProcessed: session.records.length
      }
    });
  } catch (err) {
    return error(res, { status: 500, message: err.message });
  }
});

module.exports = router;
