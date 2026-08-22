/**
 * Charlie's CRM — Bulk CSV Import Center Test Suite
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Database Models
const Company = require('../models/Company');
const User = require('../models/User');
const Product = require('../models/Product');
const SerialRegistry = require('../models/SerialRegistry');
const BulkImportJob = require('../models/BulkImportJob');
const PlatformNotification = require('../models/PlatformNotification');
const AuditEvent = require('../models/AuditEvent');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const ApiKey = require('../models/ApiKey');

// Express App setup helpers
const bulkImportRouter = require('../routes/bulkImport');
const serialValidationRouter = require('../routes/serialValidation');
const externalValidationRouter = require('../routes/externalSerialValidation');

process.env.JWT_SECRET = 'supersecretjwtkeythatislongerthan32charactersforsecurity';
delete process.env.SERIAL_VALIDATION_ACCESS_KEY;

let mongod;
let server;
let baseUrl;
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runBulkImportTests() {
  console.log('🚀 Starting Charlie\'s CRM Bulk CSV Import Center Verification Suite...\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());

  // Mount routers
  app.use('/api/serial-validation', serialValidationRouter);
  app.use('/api/v1/serial-validation', externalValidationRouter);
  app.use('/api/bulk-import', require('../middleware/featureGate').requireFeature('bulk_import'), bulkImportRouter);

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`✅ Test HTTP Server listening at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // Setup multi-tenant company context and users
    console.log('🏢 TEST GROUP 1: Provision Multi-Tenant Ecosystem');
    
    // Company A: PROFESSIONAL plan (bulk_import enabled)
    const companyA = await new Company({
      name: 'Omni Retail Corp A',
      code: 'OMNIA',
      subdomain: 'omnia',
      status: 'ACTIVE',
      features: {
        bulk_import: true,
        serial_validation: true,
        products: true
      },
      storage: {
        storageLimitBytes: 5 * 1024 * 1024 * 1024, // 5GB
        storageUsedBytes: 1000
      }
    }).save();

    // Company B: STARTER plan (bulk_import disabled)
    const companyB = await new Company({
      name: 'Vortex Global B',
      code: 'VORTEXB',
      subdomain: 'vortexb',
      status: 'ACTIVE',
      features: {
        bulk_import: false,
        serial_validation: true
      }
    }).save();

    // Company C: Over storage limit
    const companyC = await new Company({
      name: 'Quota Expired Corp C',
      code: 'QUOTAC',
      subdomain: 'quotac',
      status: 'ACTIVE',
      features: {
        bulk_import: true
      },
      storage: {
        storageLimitBytes: 1000, // 1KB limit
        storageUsedBytes: 990
      }
    }).save();

    // Company D: Isolated company with bulk_import enabled
    const companyD = await new Company({
      name: 'Isolated Corp D',
      code: 'ISO_D',
      subdomain: 'isod',
      status: 'ACTIVE',
      features: {
        bulk_import: true,
        serial_validation: true
      }
    }).save();

    // Seed User profiles
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminA = await new User({
      name: 'Admin A',
      email: 'admin@companyA.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: companyA._id,
      status: 'ACTIVE'
    }).save();

    const opsA = await new User({
      name: 'Ops Manager A',
      email: 'ops@companyA.com',
      password: passwordHash,
      role: 'operations-manager',
      companyId: companyA._id,
      permissions: ['bulk_import.view', 'bulk_import.create', 'bulk_import.validate', 'bulk_import.execute', 'bulk_import.history', 'bulk_import.export'],
      status: 'ACTIVE'
    }).save();

    const salesA = await new User({
      name: 'Sales A',
      email: 'sales@companyA.com',
      password: passwordHash,
      role: 'sales-executive',
      companyId: companyA._id,
      permissions: ['lead.view', 'lead.create'], // No bulk import access
      status: 'ACTIVE'
    }).save();

    const adminB = await new User({
      name: 'Admin B',
      email: 'admin@companyB.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: companyB._id,
      status: 'ACTIVE'
    }).save();

    const adminC = await new User({
      name: 'Admin C',
      email: 'admin@companyC.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: companyC._id,
      status: 'ACTIVE'
    }).save();

    const adminD = await new User({
      name: 'Admin D',
      email: 'admin@companyD.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: companyD._id,
      status: 'ACTIVE'
    }).save();

    // Generate JWT tokens
    const tokenAdminA = jwt.sign({ id: adminA._id, role: adminA.role, companyId: companyA._id }, process.env.JWT_SECRET);
    const tokenOpsA = jwt.sign({ id: opsA._id, role: opsA.role, companyId: companyA._id, permissions: opsA.permissions }, process.env.JWT_SECRET);
    const tokenSalesA = jwt.sign({ id: salesA._id, role: salesA.role, companyId: companyA._id, permissions: salesA.permissions }, process.env.JWT_SECRET);
    const tokenAdminB = jwt.sign({ id: adminB._id, role: adminB.role, companyId: companyB._id }, process.env.JWT_SECRET);
    const tokenAdminC = jwt.sign({ id: adminC._id, role: adminC.role, companyId: companyC._id }, process.env.JWT_SECRET);
    const tokenAdminD = jwt.sign({ id: adminD._id, role: adminD.role, companyId: companyD._id }, process.env.JWT_SECRET);

    // Seed matching product for validation
    await new Product({
      companyId: companyA._id,
      productId: 'PROD-A-ID-500W',
      sku: 'MC-500W',
      name: 'Solar Panel 500W',
      price: 15000,
      active: true
    }).save();

    // Seed API Key for external validation check
    await new ApiKey({
      key: 'TEST-API-KEY-123',
      name: 'Omni Salesforce Sync Key',
      companyId: companyA._id,
      userId: adminA._id,
      permissions: ['serial_validation.validate'],
      status: 'ACTIVE',
      active: true
    }).save();

    console.log('🌱 Seed complete. Running test scenarios...\n');

    // 1. Template downloads
    console.log('🧪 SCENARIO 1: CSV Template Downloads');
    try {
      const resProdTemp = await axios.get(`${baseUrl}/api/bulk-import/templates/products`, {
        headers: { 'Authorization': `Bearer ${tokenAdminA}` }
      });
      assert(resProdTemp.status === 200 && resProdTemp.data.includes('productCode,productName'), 'Product template download returns 200 with headers');

      const resSerialTemp = await axios.get(`${baseUrl}/api/bulk-import/templates/serials`, {
        headers: { 'Authorization': `Bearer ${tokenAdminA}` }
      });
      assert(resSerialTemp.status === 200 && resSerialTemp.data.includes('materialCode') && resSerialTemp.data.includes('serialNumber'), 'Serial template download returns 200 with headers');
    } catch (err) {
      console.error('Template download failure:', err.message);
      if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', err.response.data);
      }
      throw err;
    }

    // 2. Storage Quota Enforcement
    console.log('🧪 SCENARIO 2: Storage Quota Check');
    const boundary = '----Boundary';
    const csvContent = 'materialCode,serialNumber,dealerCode\nMC-500W,SN-1001,DLR-01\nMC-500W,SN-1002,DLR-01\n';
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="importType"',
      '',
      'serials',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="serials.csv"',
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    try {
      await axios.post(`${baseUrl}/api/bulk-import/upload`, multipartBody, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${tokenAdminC}`
        }
      });
      assert(false, 'Quota exceeded upload should be rejected');
    } catch (err) {
      assert(err.response.status === 403 && err.response.data.code === 'STORAGE_QUOTA_EXCEEDED', 'Quota exceeded upload rejected with 403 STORAGE_QUOTA_EXCEEDED');
    }

    // 3. Feature Gate Disabled check
    console.log('🧪 SCENARIO 3: Feature Gate Disabled Gating');
    try {
      await axios.post(`${baseUrl}/api/bulk-import/upload`, multipartBody, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${tokenAdminB}`
        }
      });
      assert(false, 'Company B should be blocked due to disabled feature');
    } catch (err) {
      assert(err.response.status === 403 && err.response.data.code === 'FEATURE_NOT_ENABLED', 'Company B upload rejected with 403 FEATURE_NOT_ENABLED');
    }

    // 4. Granular RBAC Permissions Gating
    console.log('🧪 SCENARIO 4: Granular RBAC permissions check');
    try {
      await axios.post(`${baseUrl}/api/bulk-import/upload`, multipartBody, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${tokenSalesA}`
        }
      });
      assert(false, 'Sales executive should be blocked from uploading');
    } catch (err) {
      assert(err.response.status === 403 && err.response.data.message.includes('Permission required'), 'Sales executive upload rejected with 403 Permission required');
    }

    // 5. Successful Upload (Company A Admin)
    console.log('🧪 SCENARIO 5: Successful upload & job creation');
    const uploadRes = await axios.post(`${baseUrl}/api/bulk-import/upload`, multipartBody, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tokenAdminA}`
      }
    });
    assert(uploadRes.status === 201 && uploadRes.data.jobId !== undefined, 'Upload succeeds, returns 201 and valid jobId');
    const jobId = uploadRes.data.jobId;

    // 6. Validation stage trigger & progress
    console.log('🧪 SCENARIO 6: Async validation engine & status checks');
    const valRes = await axios.post(`${baseUrl}/api/bulk-import/${jobId}/validate`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(valRes.status === 200 && valRes.data.status === 'VALIDATING', 'Validation trigger returns 200 and sets status to VALIDATING');

    // Wait a brief moment for validation thread execution
    await new Promise(resolve => setTimeout(resolve, 800));

    const statusRes = await axios.get(`${baseUrl}/api/bulk-import/${jobId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(statusRes.status === 200 && statusRes.data.status === 'VALIDATED', 'Validation completes, status changes to VALIDATED');
    assert(statusRes.data.validRows === 2 && statusRes.data.totalRows === 2, 'Valid rows count match exact csv rows count');

    // 7. CSV row validation failures (Missing fields, duplicates in file, invalid material code)
    console.log('🧪 SCENARIO 7: CSV row-level error validation');
    const badCsvContent = [
      'materialCode,serialNumber,dealerCode',
      ',SN-1002,DLR-01',           // Missing materialCode
      'MC-500W,,DLR-01',           // Missing serialNumber
      'MC-500W,SN-1003,DLR-01',    // Valid row 1
      'MC-500W,SN-1003,DLR-01',    // Duplicate serial in same file
      'INVALID_MC,SN-1004,DLR-01'  // Invalid material code
    ].join('\n');

    const badMultipart = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="importType"',
      '',
      'serials',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="bad_serials.csv"',
      'Content-Type: text/csv',
      '',
      badCsvContent,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const badUploadRes = await axios.post(`${baseUrl}/api/bulk-import/upload`, badMultipart, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tokenAdminA}`
      }
    });
    const badJobId = badUploadRes.data.jobId;

    await axios.post(`${baseUrl}/api/bulk-import/${badJobId}/validate`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    const badStatusRes = await axios.get(`${baseUrl}/api/bulk-import/${badJobId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(badStatusRes.data.status === 'VALIDATED', 'Bad CSV validation completes');
    assert(badStatusRes.data.validRows === 1, 'Correctly validated only 1 row as VALID');
    assert(badStatusRes.data.errorRows === 4, 'Correctly identified 4 error rows');

    // 8. Download Error CSV
    console.log('🧪 SCENARIO 8: Error CSV download validation');
    const errorCsvRes = await axios.get(`${baseUrl}/api/bulk-import/${badJobId}/errors`, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(errorCsvRes.status === 200 && errorCsvRes.data.includes('errorCode,errorMessage'), 'Error CSV contains headers');
    assert(errorCsvRes.data.includes('MISSING_MATERIAL_CODE') && errorCsvRes.data.includes('DUPLICATE_IN_FILE'), 'Contains row error codes');

    const errorCsvQueryRes = await axios.get(`${baseUrl}/api/bulk-import/${badJobId}/errors?token=${tokenAdminA}`);
    assert(errorCsvQueryRes.status === 200 && errorCsvQueryRes.data.includes('errorCode,errorMessage'), 'Error CSV download using query token parameter returns 200 with headers');

    // 9. Existing serial duplicate checks
    console.log('🧪 SCENARIO 9: Duplicate checking against existing database');
    // Pre-insert serial
    await new SerialRegistry({
      companyId: companyA._id,
      materialCode: 'MC-500W',
      serialNumber: 'SN-DB-DUP',
      status: 'IN_STOCK'
    }).save();

    const dupCsv = 'materialCode,serialNumber,dealerCode\nMC-500W,SN-DB-DUP,DLR-01\n';
    const dupMultipart = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="importType"',
      '',
      'serials',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="dup.csv"',
      'Content-Type: text/csv',
      '',
      dupCsv,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const dupUpload = await axios.post(`${baseUrl}/api/bulk-import/upload`, dupMultipart, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tokenAdminA}`
      }
    });
    await axios.post(`${baseUrl}/api/bulk-import/${dupUpload.data.jobId}/validate`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });

    await new Promise(resolve => setTimeout(resolve, 800));
    const dupStatus = await axios.get(`${baseUrl}/api/bulk-import/${dupUpload.data.jobId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(dupStatus.data.errorRows === 1, 'Identified existing serial duplicate as error row');

    // 10. Execute validated records import
    console.log('🧪 SCENARIO 10: Asynchronous DB commit & completion notification');
    const commitRes = await axios.post(`${baseUrl}/api/bulk-import/${jobId}/execute`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(commitRes.status === 200 && commitRes.data.status === 'IMPORTING', 'Commit trigger returns 200 and status sets to IMPORTING');

    await new Promise(resolve => setTimeout(resolve, 800));

    const finalJob = await axios.get(`${baseUrl}/api/bulk-import/${jobId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(finalJob.data.status === 'COMPLETED', 'Execution complete, status sets to COMPLETED');
    assert(finalJob.data.importedRows === 2, 'Verify imported rows equals 2 in DB');

    // Verify DB insertion
    const registryRecord = await SerialRegistry.findOne({ companyId: companyA._id, serialNumber: 'SN-1001' });
    assert(registryRecord !== null && registryRecord.materialCode === 'MC-500W', 'Imported serial is verified inside SerialRegistry collection');

    // Verify in-app notifications
    const notifications = await PlatformNotification.find({ targetCompanies: companyA._id });
    assert(notifications.length > 0 && notifications[0].title.includes('import completed'), 'In-app notification is successfully logged for SELECTED_COMPANIES');

    // Verify audit log
    const auditLogs = await AuditEvent.find({ action: 'bulk_import.execute' });
    assert(auditLogs.length > 0, 'Audit event log is written');
    assert(!JSON.stringify(auditLogs).includes('SN-1001'), 'Audit log does NOT expose plain serial numbers');

    // 11. Tenant isolation check
    console.log('🧪 SCENARIO 11: Multi-tenant isolation verification');
    // Verify Company D (enabled bulk_import) cannot retrieve Company A's job details
    try {
      await axios.get(`${baseUrl}/api/bulk-import/${jobId}`, {
        headers: { 'Authorization': `Bearer ${tokenAdminD}` }
      });
      assert(false, 'Cross-tenant job lookup by Company D should return 404');
    } catch (err) {
      assert(err.response.status === 404, 'Company D lookup returns 404 on cross-tenant access');
    }

    // Verify Company B (disabled bulk_import) is gated with 403
    try {
      await axios.get(`${baseUrl}/api/bulk-import/${jobId}`, {
        headers: { 'Authorization': `Bearer ${tokenAdminB}` }
      });
      assert(false, 'Company B lookup should be blocked with 403');
    } catch (err) {
      assert(err.response.status === 403 && err.response.data.code === 'FEATURE_NOT_ENABLED', 'Company B lookup returns 403 FEATURE_NOT_ENABLED');
    }

    // Verify Company D history is isolated and empty
    const historyD = await axios.get(`${baseUrl}/api/bulk-import`, {
      headers: { 'Authorization': `Bearer ${tokenAdminD}` }
    });
    assert(historyD.data.length === 0, 'Company D history is empty and isolated from Company A');

    // 12. Short-cuts and static links check
    console.log('🧪 SCENARIO 12: Shortcuts and page links check');
    const manageProductsHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'manage-products.html'), 'utf8');
    assert(manageProductsHtml.includes('/bulk-import.html?type=products'), 'manage-products.html includes product bulk import shortcut');

    const serialValidationHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'serial-validation.html'), 'utf8');
    assert(serialValidationHtml.includes('/bulk-import.html?type=serials'), 'serial-validation.html includes serial bulk upload shortcut');

    // 13. Imported serial available to validation engines
    console.log('🧪 SCENARIO 13: Imported serial validation eligibility');
    // Test internal validation
    const internalValRes = await axios.post(`${baseUrl}/api/serial-validation/validate`, {
      materialCode: 'MC-500W',
      serialNumber: 'SN-1001',
      dealerCode: 'DLR-01'
    }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(internalValRes.status === 200 && internalValRes.data.data && internalValRes.data.data.verified === true, 'Imported serial validated successfully via internal API');

    // Test external partner validation
    // Need mock request payload for external validation API call, let's mock req context
    const externalValRes = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'MC-500W',
      serialNumber: 'SN-1002',
      dealerCode: 'DLR-01'
    }, {
      headers: { 'X-API-Key': 'TEST-API-KEY-123' } // Authenticated with tenant API key credentials
    });
    assert(externalValRes.status === 200 && externalValRes.data.verified === true, 'Imported serial validated successfully via external partner API');
    assert(externalValRes.data.responseStatus === '0', 'Returns responseStatus 0 for valid validation');
    assert(externalValRes.data.responseMessage === 'Valid Serial Number', 'Returns mapped valid serial message');
    assert(externalValRes.data.responeMessage === 'Valid Serial Number', 'Returns typo message variant for Salesforce');

    // Test body-based accessKey and already validated (-3) state with mixed casing
    const externalValResBody = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialcode: 'MC-500W',
      serialnumber: 'SN-1002',
      dealercode: 'DLR-01',
      accesskey: 'TEST-API-KEY-123'
    });
    assert(externalValResBody.status === 200, 'Validates with body-based accessKey returns 200');
    assert(externalValResBody.data.responseStatus === '-3', 'Returns already validated responseStatus -3');
    assert(externalValResBody.data.responseMessage === 'Serial Number Already Validated', 'Returns already validated message');

    // 14. Validation Analytics count check
    console.log('🧪 SCENARIO 14: Validation analytics count logic check');
    // CSV registration should NOT increment validation metrics. They should increment only during check validations.
    const beforeCount = await SerialValidationHistory.countDocuments({ companyId: companyA._id });
    
    // Upload a new serial registry item
    const newSerialCsv = 'materialCode,serialNumber,dealerCode\nMC-500W,SN-ANALYTICS-CHECK,DLR-01\n';
    const newSerialMultipart = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="importType"',
      '',
      'serials',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="new_serial.csv"',
      'Content-Type: text/csv',
      '',
      newSerialCsv,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const newUpload = await axios.post(`${baseUrl}/api/bulk-import/upload`, newSerialMultipart, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tokenAdminA}`
      }
    });
    await axios.post(`${baseUrl}/api/bulk-import/${newUpload.data.jobId}/validate`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    await new Promise(resolve => setTimeout(resolve, 800));
    await axios.post(`${baseUrl}/api/bulk-import/${newUpload.data.jobId}/execute`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    await new Promise(resolve => setTimeout(resolve, 800));

    const afterCount = await SerialValidationHistory.countDocuments({ companyId: companyA._id });
    assert(beforeCount === afterCount, 'Validation history metrics are unaffected by CSV import registration operations');

    // 15. Large batch simulations
    console.log('🧪 SCENARIO 15: Large batch and Mongoose bulkWrite checking');
    const largeRows = ['materialCode,serialNumber,dealerCode'];
    for (let i = 0; i < 100; i++) {
      largeRows.push(`MC-500W,SN-BATCH-${i},DLR-01`);
    }
    const largeMultipart = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="importType"',
      '',
      'serials',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="large.csv"',
      'Content-Type: text/csv',
      '',
      largeRows.join('\n'),
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const largeUpload = await axios.post(`${baseUrl}/api/bulk-import/upload`, largeMultipart, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tokenAdminA}`
      }
    });
    await axios.post(`${baseUrl}/api/bulk-import/${largeUpload.data.jobId}/validate`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await axios.post(`${baseUrl}/api/bulk-import/${largeUpload.data.jobId}/execute`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const largeJob = await axios.get(`${baseUrl}/api/bulk-import/${largeUpload.data.jobId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdminA}` }
    });
    assert(largeJob.data.status === 'COMPLETED' && largeJob.data.importedRows === 100, 'Simulated 100 batch rows successfully parsed, validated, and committed');

    console.log('\n======================================================================');
    console.log(`🏁 BULK CSV IMPORT TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================================\n');

    // Cleanup servers
    server.close();
    await mongoose.connection.close();
    await mongod.stop();
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    if (error.response) {
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
    server.close();
    await mongoose.connection.close();
    await mongod.stop();
    process.exit(1);
  }
}

if (require.main === module) {
  runBulkImportTests();
}

module.exports = { runBulkImportTests };
