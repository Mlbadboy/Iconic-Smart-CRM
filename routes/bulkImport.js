const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const logger = require('../services/logger');

// Database Models
const BulkImportJob = require('../models/BulkImportJob');
const Company = require('../models/Company');
const Product = require('../models/Product');
const SerialRegistry = require('../models/SerialRegistry');
const PlatformNotification = require('../models/PlatformNotification');

const router = express.Router();

// Helper to parse CSV line handling quoted commas
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^"|"$/g, '').trim());
  return result;
}

// Multer disk storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const companyId = req.user.companyId;
    const dir = path.join(__dirname, '..', 'uploads', 'bulk-imports', String(companyId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const jobId = 'JOB-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    req.generatedJobId = jobId;
    const ext = path.extname(file.originalname);
    cb(null, `${jobId}-original${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.csv') {
    return cb(new Error('Only CSV files are allowed.'));
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max size
});

// A. Helper to check storage quota
async function checkQuota(companyId, incomingSize) {
  const company = await Company.findById(companyId);
  if (!company) throw new Error('Company not found');
  const storageUsed = company.storage?.storageUsedBytes || 0;
  const storageLimit = company.storage?.storageLimitBytes || 5 * 1024 * 1024 * 1024; // Default 5GB
  return (storageUsed + incomingSize <= storageLimit);
}

// 1. Upload CSV File
router.post('/upload', auth, requirePermission('bulk_import.create'), (req, res) => {
  upload.single('file')(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a CSV file.' });
      }

      const { importType } = req.body;
      if (!['products', 'serials'].includes(importType)) {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Invalid importType. Must be products or serials.' });
      }

      const companyId = req.user.companyId;
      const hasSpace = await checkQuota(companyId, req.file.size);
      if (!hasSpace) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({
          error: "Your company's storage limit has been reached. Please contact your platform administrator.",
          code: 'STORAGE_QUOTA_EXCEEDED'
        });
      }

      // Create BulkImportJob document in UPLOADED state
      const job = new BulkImportJob({
        jobId: req.generatedJobId,
        companyId: companyId,
        createdBy: req.user.id,
        importType: importType,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        status: 'UPLOADED',
        progress: 0
      });
      await job.save();

      // Add to company storage
      const company = await Company.findById(companyId);
      if (company) {
        if (!company.storage) company.storage = {};
        company.storage.storageUsedBytes = (company.storage.storageUsedBytes || 0) + req.file.size;
        company.markModified('storage');
        await company.save();
      }

      res.status(201).json({
        message: 'File uploaded successfully',
        jobId: job.jobId,
        fileName: job.fileName,
        fileSize: job.fileSize,
        importType: job.importType,
        status: job.status
      });
    } catch (error) {
      logger.error('Error uploading bulk file:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// 2. Validate Import File (Two-stage process validation trigger)
router.post('/:jobId/validate', auth, requirePermission('bulk_import.validate'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const mode = req.body.mode || 'CREATE_ONLY'; // CREATE_ONLY or CREATE_UPDATE
    const job = await BulkImportJob.findOne({ jobId, companyId: req.user.companyId });
    if (!job) {
      return res.status(404).json({ error: 'Import job not found.' });
    }

    if (job.status !== 'UPLOADED') {
      return res.status(400).json({ error: `Job is already in ${job.status} state.` });
    }

    job.status = 'VALIDATING';
    job.progress = 0;
    await job.save();

    // Start async validation process in background
    runAsyncValidation(job, mode).catch(err => {
      logger.error(`Validation background failure for ${jobId}:`, err);
    });

    res.json({ message: 'Validation engine started in background.', jobId: job.jobId, status: job.status });
  } catch (error) {
    logger.error('Error triggering validation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Async validation processor
async function runAsyncValidation(job, mode) {
  const companyId = job.companyId;
  const baseDir = path.join(__dirname, '..', 'uploads', 'bulk-imports', String(companyId));
  const originalPath = path.join(baseDir, `${job.jobId}-original.csv`);
  const errorsPath = path.join(baseDir, `${job.jobId}-errors.csv`);
  const validPath = path.join(baseDir, `${job.jobId}-valid.json`);

  if (!fs.existsSync(originalPath)) {
    job.status = 'FAILED';
    job.completedAt = new Date();
    await job.save();
    return;
  }

  // Count lines first to compute totalRows
  let totalRows = 0;
  const countStream = fs.createReadStream(originalPath);
  const countInterface = readline.createInterface({ input: countStream, crlfDelay: Infinity });
  for await (const line of countInterface) {
    if (line.trim()) totalRows++;
  }
  // Subtract header
  if (totalRows > 0) totalRows--;
  job.totalRows = totalRows;
  await job.save();

  const fileStream = fs.createReadStream(originalPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headerFields = [];
  let isFirstLine = true;
  let idx = 0;

  let validCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  const seenKeys = new Set();

  const errorWriter = fs.createWriteStream(errorsPath);
  errorWriter.write('rowNumber,serialNumber,materialCode,errorCode,errorMessage\n');

  const validWriter = fs.createWriteStream(validPath);
  validWriter.write('[\n');

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isFirstLine) {
      headerFields = parseCsvLine(line).map(h => h.toLowerCase());
      isFirstLine = false;
      continue;
    }

    idx++;
    const rowValues = parseCsvLine(line);
    const rowObj = {};
    headerFields.forEach((field, i) => {
      rowObj[field] = rowValues[i] || '';
    });

    let rowIsValid = true;
    let errorCode = '';
    let errorMessage = '';

    const rowNum = idx + 1;
    const fileKey = (job.importType === 'products')
      ? (rowObj.productcode || rowObj.sku || '').toUpperCase()
      : (rowObj.serialnumber || '').toUpperCase();

    // 1. Required fields checks
    // 1. Required fields checks
    if (job.importType === 'products') {
      const sku = (rowObj.productcode || rowObj.sku || rowObj.materialcode || '').trim();
      const name = (rowObj.productname || rowObj.name || '').trim();
      const price = parseFloat(rowObj.price || '0');

      if (!sku) {
        rowIsValid = false;
        errorCode = 'MISSING_PRODUCT_CODE';
        errorMessage = 'Product code (sku) is required';
      } else if (!name) {
        rowIsValid = false;
        errorCode = 'MISSING_PRODUCT_NAME';
        errorMessage = 'Product name is required';
      } else if (isNaN(price)) {
        rowIsValid = false;
        errorCode = 'INVALID_PRICE';
        errorMessage = 'Price must be a valid number';
      }
    } else {
      const materialCode = (rowObj.materialcode || rowObj.productcode || '').trim();
      const serialNumber = (rowObj.serialnumber || '').trim();

      if (!materialCode) {
        rowIsValid = false;
        errorCode = 'MISSING_MATERIAL_CODE';
        errorMessage = 'Material code is required';
      } else if (!serialNumber) {
        rowIsValid = false;
        errorCode = 'MISSING_SERIAL_NUMBER';
        errorMessage = 'Serial number is required';
      }
    }

    // 2. Duplicate checks inside file
    if (rowIsValid) {
      if (seenKeys.has(fileKey)) {
        rowIsValid = false;
        errorCode = 'DUPLICATE_IN_FILE';
        errorMessage = `Row contains duplicate key '${fileKey}' inside this upload file`;
      } else {
        seenKeys.add(fileKey);
      }
    }

    // 3. Database validation checks
    if (rowIsValid) {
      if (job.importType === 'products') {
        const sku = (rowObj.productcode || rowObj.sku || rowObj.materialcode || '').trim();
        const matCode = (rowObj.materialcode || '').trim();
        const prdCode = (rowObj.productcode || '').trim();

        const orFilters = [{ sku }];
        if (matCode) orFilters.push({ materialCode: matCode });
        if (prdCode) orFilters.push({ productCode: prdCode });

        const existing = await Product.findOne({ companyId, $or: orFilters });
        if (existing && mode === 'CREATE_ONLY') {
          rowIsValid = false;
          errorCode = 'PRODUCT_ALREADY_EXISTS';
          errorMessage = `Product with SKU/Code '${sku}' already exists in database`;
        }
      } else {
        const serialNumber = (rowObj.serialnumber || '').trim();
        const materialCode = (rowObj.materialcode || rowObj.productcode || '').trim();
        const productCode = (rowObj.productcode || '').trim();

        // Validate product catalog mapping flexibly across materialCode, sku, productCode, model, productId
        let productExists = await Product.findOne({
          companyId,
          $or: [
            { materialCode: new RegExp(`^${materialCode}$`, 'i') },
            { sku: new RegExp(`^${materialCode}$`, 'i') },
            { productCode: new RegExp(`^${materialCode}$`, 'i') },
            { productId: new RegExp(`^${materialCode}$`, 'i') },
            { model: new RegExp(`^${materialCode}$`, 'i') },
            ...(productCode ? [
              { productCode: new RegExp(`^${productCode}$`, 'i') },
              { sku: new RegExp(`^${productCode}$`, 'i') },
              { materialCode: new RegExp(`^${productCode}$`, 'i') }
            ] : [])
          ]
        });

        // Fallback search across catalog if tenant-scoped search misses due to session transition
        if (!productExists) {
          productExists = await Product.findOne({
            $or: [
              { materialCode: new RegExp(`^${materialCode}$`, 'i') },
              { sku: new RegExp(`^${materialCode}$`, 'i') },
              { productCode: new RegExp(`^${materialCode}$`, 'i') },
              { productId: new RegExp(`^${materialCode}$`, 'i') },
              { model: new RegExp(`^${materialCode}$`, 'i') },
              ...(productCode ? [
                { productCode: new RegExp(`^${productCode}$`, 'i') },
                { sku: new RegExp(`^${productCode}$`, 'i') },
                { materialCode: new RegExp(`^${productCode}$`, 'i') }
              ] : [])
            ]
          });
        }

        // Staging Fallback: Check recently uploaded/staged product CSVs that are in VALIDATED or UPLOADED state
        if (!productExists) {
          try {
            const stagedJobs = await BulkImportJob.find({
              companyId,
              importType: 'products'
            }).sort({ createdAt: -1 }).limit(10);

            for (const pJob of stagedJobs) {
              const stagedValidFile = path.join(baseDir, `${pJob.jobId}-valid.json`);
              if (fs.existsSync(stagedValidFile)) {
                const stagedList = JSON.parse(fs.readFileSync(stagedValidFile, 'utf8'));
                const found = stagedList.find(rec => {
                  const recMat = (rec.materialcode || rec.productcode || rec.sku || '').trim().toLowerCase();
                  const recSku = (rec.productcode || rec.sku || '').trim().toLowerCase();
                  const recModel = (rec.model || '').trim().toLowerCase();
                  const searchMat = materialCode.toLowerCase();
                  const searchPrd = productCode.toLowerCase();
                  return recMat === searchMat || recSku === searchMat || recModel === searchMat ||
                         (searchPrd && (recSku === searchPrd || recMat === searchPrd));
                });
                if (found) {
                  productExists = found;
                  break;
                }
              }
            }
          } catch (e) {
            // Ignore staging lookup errors
          }
        }

        if (!productExists) {
          rowIsValid = false;
          errorCode = 'INVALID_MATERIAL_CODE';
          errorMessage = `Material code '${materialCode}' does not exist in product catalog`;
        } else {
          // Check duplicate serial registry
          const existingSerial = await SerialRegistry.findOne({ companyId, serialNumber });
          if (existingSerial && mode === 'CREATE_ONLY') {
            rowIsValid = false;
            errorCode = 'SERIAL_ALREADY_EXISTS';
            errorMessage = `Serial number '${serialNumber}' already exists in registry`;
          }
        }
      }
    }

    // Write output streams
    if (rowIsValid) {
      validWriter.write((validCount > 0 ? ',\n' : '') + JSON.stringify(rowObj));
      validCount++;
    } else {
      const serialVal = rowObj.serialnumber || '';
      const matVal = rowObj.materialcode || rowObj.productcode || rowObj.sku || '';
      errorWriter.write(`${rowNum},"${serialVal}","${matVal}","${errorCode}","${errorMessage}"\n`);
      errorCount++;
    }

    // Dynamic progress update every 1000 records
    if (idx % 1000 === 0 || idx === totalRows) {
      job.progress = Math.round((idx / totalRows) * 100);
      job.processedRows = idx;
      job.validRows = validCount;
      job.errorRows = errorCount;
      await job.save();
    }
  }

  validWriter.write('\n]');
  validWriter.end();
  errorWriter.end();

  // Update final status
  job.status = 'VALIDATED';
  job.progress = 100;
  job.processedRows = idx;
  job.validRows = validCount;
  job.errorRows = errorCount;
  job.warningRows = warningCount;
  if (errorCount > 0) {
    job.errorFilePath = errorsPath;
  }
  job.resultFilePath = validPath;
  await job.save();
}

// 3. Execute Validated Import (Commit data)
router.post('/:jobId/execute', auth, requirePermission('bulk_import.execute'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const mode = req.body.mode || 'CREATE_ONLY';
    const job = await BulkImportJob.findOne({ jobId, companyId: req.user.companyId });

    if (!job) {
      return res.status(404).json({ error: 'Import job not found.' });
    }

    if (job.status !== 'VALIDATED') {
      return res.status(400).json({ error: `Job status is ${job.status}. Cannot commit unless VALIDATED.` });
    }

    if (job.validRows === 0) {
      return res.status(400).json({ error: 'No valid rows found to import.' });
    }

    job.status = 'IMPORTING';
    job.progress = 0;
    await job.save();

    // Start async db execution in background
    runAsyncDbExecution(job, mode, req).catch(err => {
      logger.error(`Database commit execution failed for ${jobId}:`, err);
    });

    res.json({ message: 'Database import commit started.', jobId: job.jobId, status: job.status });
  } catch (error) {
    logger.error('Error committing validated import:', error);
    res.status(500).json({ error: error.message });
  }
});

// Async DB commit execution processor
async function runAsyncDbExecution(job, mode, req) {
  const companyId = job.companyId;
  const validPath = job.resultFilePath;

  if (!validPath || !fs.existsSync(validPath)) {
    job.status = 'FAILED';
    job.completedAt = new Date();
    await job.save();
    return;
  }

  const validRecords = JSON.parse(fs.readFileSync(validPath, 'utf8'));
  const total = validRecords.length;
  let importedCount = 0;
  let rejectedCount = job.errorRows;

  // Process in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < total; i += batchSize) {
    const batch = validRecords.slice(i, i + batchSize);
    const bulkOps = [];

    if (job.importType === 'products') {
      for (const rec of batch) {
        const sku = (rec.productcode || rec.sku || rec.materialcode || '').trim();
        const productCode = (rec.productcode || rec.sku || '').trim();
        const materialCode = (rec.materialcode || rec.productcode || rec.sku || '').trim();
        const model = (rec.model || '').trim();
        const name = (rec.productname || rec.name || '').trim();
        const price = parseFloat(rec.price || '0');
        const mrp = rec.mrp ? parseFloat(rec.mrp) : undefined;
        const brand = rec.brand || 'Iconic Smart';
        const category = rec.category || 'General';
        const description = rec.description || '';
        const unit = rec.unitofmeasure || rec.unit || 'piece';
        const warranty = rec.warranty || rec.warrantymonths ? `${rec.warrantymonths} months` : '1 Year';
        const stockQuantity = rec.stock || rec.stockquantity ? parseInt(rec.stock || rec.stockquantity, 10) : 10;

        const updateDoc = {
          companyId,
          sku,
          productCode,
          materialCode,
          model,
          name,
          price,
          mrp,
          brand,
          category,
          description,
          unit,
          warranty,
          stockQuantity,
          active: rec.status ? rec.status.toUpperCase() === 'ACTIVE' : true
        };

        if (mode === 'CREATE_UPDATE') {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          const generatedId = `ICON${timestamp}${random}`;
          bulkOps.push({
            updateOne: {
              filter: { companyId, sku },
              update: { 
                $set: updateDoc,
                $setOnInsert: { productId: generatedId }
              },
              upsert: true
            }
          });
        } else {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          const generatedId = `ICON${timestamp}${random}`;
          bulkOps.push({
            insertOne: { document: { ...updateDoc, productId: generatedId } }
          });
        }
      }
      await Product.bulkWrite(bulkOps);
      importedCount += batch.length;
    } else {
      // Import serial registry master units
      for (const rec of batch) {
        const serialNumber = (rec.serialnumber || '').trim();
        const materialCode = (rec.materialcode || rec.productcode || '').trim();
        const productCode = (rec.productcode || '').trim();
        const dealerCode = rec.dealercode || '';
        const distributorCode = rec.distributorcode || '';
        const region = rec.region || '';
        const territory = rec.territory || '';
        const customer = rec.customer || '';

        const validStatuses = ['IN_STOCK', 'IN_TRANSIT', 'TRANSFERRED', 'SOLD', 'REGISTERED', 'VALIDATED', 'DEFECTIVE', 'DEACTIVATED'];
        const statusVal = (rec.status && validStatuses.includes(rec.status.toUpperCase())) 
          ? rec.status.toUpperCase() 
          : 'IN_STOCK';

        // Find matched product in registry flexibly
        let product = await Product.findOne({
          companyId,
          $or: [
            { materialCode: new RegExp(`^${materialCode}$`, 'i') },
            { sku: new RegExp(`^${materialCode}$`, 'i') },
            { productCode: new RegExp(`^${materialCode}$`, 'i') },
            { productId: new RegExp(`^${materialCode}$`, 'i') },
            { model: new RegExp(`^${materialCode}$`, 'i') },
            ...(productCode ? [
              { productCode: new RegExp(`^${productCode}$`, 'i') },
              { sku: new RegExp(`^${productCode}$`, 'i') },
              { materialCode: new RegExp(`^${productCode}$`, 'i') }
            ] : [])
          ]
        }).lean();

        if (!product) {
          try {
            const stagedJobs = await BulkImportJob.find({
              companyId,
              importType: 'products'
            }).sort({ createdAt: -1 }).limit(10);

            for (const pJob of stagedJobs) {
              const stagedValidFile = path.join(baseDir, `${pJob.jobId}-valid.json`);
              if (fs.existsSync(stagedValidFile)) {
                const stagedList = JSON.parse(fs.readFileSync(stagedValidFile, 'utf8'));
                const found = stagedList.find(stRec => {
                  const recMat = (stRec.materialcode || stRec.productcode || stRec.sku || '').trim().toLowerCase();
                  const recSku = (stRec.productcode || stRec.sku || '').trim().toLowerCase();
                  const recModel = (stRec.model || '').trim().toLowerCase();
                  const searchMat = materialCode.toLowerCase();
                  const searchPrd = productCode.toLowerCase();
                  return recMat === searchMat || recSku === searchMat || recModel === searchMat ||
                         (searchPrd && (recSku === searchPrd || recMat === searchPrd));
                });
                if (found) {
                  const newProd = new Product({
                    companyId,
                    sku: (found.productcode || found.sku || found.materialcode || materialCode).trim(),
                    productCode: (found.productcode || found.sku || '').trim(),
                    materialCode: (found.materialcode || found.productcode || found.sku || materialCode).trim(),
                    model: (found.model || '').trim(),
                    name: (found.productname || found.name || 'Imported Product').trim(),
                    price: parseFloat(found.price || '0'),
                    mrp: found.mrp ? parseFloat(found.mrp) : undefined,
                    brand: found.brand || 'Iconic Smart',
                    category: found.category || 'General',
                    description: found.description || ''
                  });
                  await newProd.save();
                  product = newProd.toObject();
                  break;
                }
              }
            }
          } catch (e) {
            // Ignore staging auto-creation error
          }
        }

        const updateDoc = {
          companyId,
          productId: product?._id,
          materialCode: materialCode || product?.materialCode || product?.sku,
          serialNumber,
          dealerCode,
          distributorCode,
          region,
          territory,
          customer,
          status: statusVal,
          registrationStatus: 'REGISTERED',
          activationStatus: 'ACTIVE',
          uploadedBy: job.createdBy
        };

        if (mode === 'CREATE_UPDATE') {
          bulkOps.push({
            updateOne: {
              filter: { companyId, serialNumber },
              update: { 
                $set: updateDoc,
                $push: {
                  ownershipHistory: {
                    dealerCode,
                    customerName: customer,
                    source: 'CSV_IMPORT',
                    importSessionId: job.jobId,
                    assignedAt: new Date(),
                    changedBy: job.createdBy,
                    reason: `Import update/creation via jobId: ${job.jobId}`
                  }
                }
              },
              upsert: true
            }
          });
        } else {
          bulkOps.push({
            insertOne: {
              document: {
                ...updateDoc,
                ownershipHistory: [{
                  dealerCode,
                  customerName: customer,
                  source: 'CSV_IMPORT',
                  importSessionId: job.jobId,
                  assignedAt: new Date(),
                  changedBy: job.createdBy,
                  reason: `Initial creation via jobId: ${job.jobId}`
                }]
              }
            }
          });
        }
      }
      await SerialRegistry.bulkWrite(bulkOps);
      importedCount += batch.length;
    }

    // Update importing progress
    job.progress = Math.round((Math.min(i + batchSize, total) / total) * 100);
    job.importedRows = importedCount;
    await job.save();
  }

  // Update status to completed
  job.status = job.errorRows > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
  job.progress = 100;
  job.completedAt = new Date();
  job.importedRows = importedCount;
  job.rejectedRows = rejectedCount;
  await job.save();

  // In-app Notification creation
  const notificationTitle = `${job.importType === 'products' ? 'Product' : 'Serial'} import completed`;
  const notificationMessage = `✓ ${importedCount} records imported successfully. ${rejectedCount} records required attention.`;

  await PlatformNotification.create({
    title: notificationTitle,
    message: notificationMessage,
    type: 'GENERAL',
    priority: 'MEDIUM',
    audience: 'SELECTED_COMPANIES',
    targetCompanies: [companyId],
    status: 'PUBLISHED',
    createdBy: job.createdBy,
    startTime: new Date()
  });

  // Record audit logging (Never log full serials)
  await recordAuditEvent(req, {
    action: 'bulk_import.execute',
    entity: 'BulkImportJob',
    entityId: job._id,
    newValue: {
      fileName: job.fileName,
      importType: job.importType,
      totalRows: job.totalRows,
      importedRows: job.importedRows,
      rejectedRows: job.rejectedRows,
      status: job.status
    }
  });

  // Storage cleanups (remove valid JSON payload to save space)
  if (fs.existsSync(validPath)) {
    fs.unlinkSync(validPath);
  }
}

// 4. Retrieve single import job status
router.get('/:jobId', auth, requirePermission('bulk_import.view'), async (req, res) => {
  try {
    const job = await BulkImportJob.findOne({ jobId: req.params.jobId, companyId: req.user.companyId }).lean();
    if (!job) {
      return res.status(404).json({ error: 'Import job not found.' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get import history list
router.get('/', auth, requirePermission('bulk_import.history'), async (req, res) => {
  try {
    // List history for tenant
    const list = await BulkImportJob.find({ companyId: req.user.companyId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Download error CSV
router.get('/:jobId/errors', auth, requirePermission('bulk_import.export'), async (req, res) => {
  try {
    const job = await BulkImportJob.findOne({ jobId: req.params.jobId, companyId: req.user.companyId }).lean();
    if (!job || !job.errorFilePath) {
      return res.status(404).json({ error: 'Error log not found for this import job.' });
    }

    if (!fs.existsSync(job.errorFilePath)) {
      return res.status(404).json({ error: 'Error log file has been cleaned up or does not exist.' });
    }

    res.download(job.errorFilePath, `${job.jobId}-errors.csv`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Get final import report summary JSON
router.get('/:jobId/report', auth, requirePermission('bulk_import.view'), async (req, res) => {
  try {
    const job = await BulkImportJob.findOne({ jobId: req.params.jobId, companyId: req.user.companyId }).lean();
    if (!job) {
      return res.status(404).json({ error: 'Import job report not found.' });
    }
    res.json({
      jobId: job.jobId,
      importType: job.importType,
      fileName: job.fileName,
      totalRows: job.totalRows,
      validRows: job.validRows,
      errorRows: job.errorRows,
      importedRows: job.importedRows,
      rejectedRows: job.rejectedRows,
      status: job.status,
      completedAt: job.completedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Download Product CSV template
router.get('/templates/products', auth, requirePermission('bulk_import.view'), (req, res) => {
  const headers = 'productCode,productName,brand,category,price,mrp,model,materialCode,description,unitOfMeasure,warrantyMonths,status\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=products_template.csv');
  res.status(200).send(headers);
});

// 9. Download Serial CSV template
router.get('/templates/serials', auth, requirePermission('bulk_import.view'), (req, res) => {
  const headers = 'materialCode,productCode,serialNumber,batchNumber,manufacturingDate,dealerCode,distributorCode,region,territory,status\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=serials_template.csv');
  res.status(200).send(headers);
});

module.exports = router;
