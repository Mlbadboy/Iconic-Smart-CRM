/**
 * Charlie's CRM — API Usage & Serial Validation Analytics Verification Suite
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');
const axios = require('axios');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Company = require('../models/Company');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const SerialRegistry = require('../models/SerialRegistry');
const SerialValidationHistory = require('../models/SerialValidationHistory');

const apiKeysRouter = require('../routes/apiKeys');
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

async function runApiAnalyticsTests() {
  console.log('🚀 Starting Charlie\'s CRM API Usage & Serial Analytics Verification Suite...\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());
  app.use('/api/api-keys', apiKeysRouter);
  app.use('/api/v1/serial-validation', externalValidationRouter);

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
    // 1. Setup Companies and API Keys
    console.log('🏢 TEST GROUP 1: Provision Multi-Tenant Companies & Keys');
    const compA = await new Company({
      name: 'Omni Solar Corp',
      code: 'OMNI',
      subdomain: 'omni',
      status: 'ACTIVE',
      isActive: true
    }).save();

    const compB = await new Company({
      name: 'Vortex Power Ltd',
      code: 'VORTEX',
      subdomain: 'vortex',
      status: 'ACTIVE',
      isActive: true
    }).save();

    const passwordHash = await bcrypt.hash('SecurePass123!', 10);
    const userA = await new User({
      name: 'Omni Admin',
      email: 'admin@omni.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compA._id
    }).save();

    const userB = await new User({
      name: 'Vortex Admin',
      email: 'admin@vortex.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compB._id
    }).save();

    const superAdmin = await new User({
      name: 'Super Admin',
      email: 'super@charliescrm.com',
      password: passwordHash,
      role: 'super-admin'
    }).save();

    const tokenA = jwt.sign({ id: userA._id, role: userA.role, companyId: compA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: userB._id, role: userB.role, companyId: compB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokenSuper = jwt.sign({ id: superAdmin._id, role: superAdmin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Generate API Key for Omni
    const createKeyResA = await axios.post(
      `${baseUrl}/api/api-keys`,
      { name: 'Omni Salesforce Connector', feature: 'Serial Number Validation' },
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );
    const keyDocA = createKeyResA.data.apiKey;
    const rawKeyA = keyDocA.key;

    assert(Boolean(keyDocA.id), 'Generated Omni API key');

    // Register units in Omni
    await new SerialRegistry({
      companyId: compA._id,
      materialCode: 'SOLAR_MOD_100',
      serialNumber: 'SN_OMNI_1001',
      dealerCode: 'DLR_OMNI_1',
      status: 'IN_STOCK'
    }).save();

    await new SerialRegistry({
      companyId: compA._id,
      materialCode: 'SOLAR_MOD_100',
      serialNumber: 'SN_OMNI_1002',
      dealerCode: 'DLR_OMNI_1',
      status: 'IN_STOCK'
    }).save();

    // 2. Perform Multiple Validation Calls (Distinct vs Duplicate Serials)
    console.log('\n📊 TEST GROUP 2: Track Total Requests vs Unique Serials (Zero Duplicate Inflation)');
    
    // Validate SN_OMNI_1001 (Call 1 - VALID)
    await axios.post(
      `${baseUrl}/api/v1/serial-validation/validate`,
      { materialCode: 'SOLAR_MOD_100', serialNumber: 'SN_OMNI_1001', dealerCode: 'DLR_OMNI_1' },
      { headers: { 'X-API-Key': rawKeyA } }
    );

    // Validate SN_OMNI_1001 again (Call 2 - ALREADY_VALIDATED)
    await axios.post(
      `${baseUrl}/api/v1/serial-validation/validate`,
      { materialCode: 'SOLAR_MOD_100', serialNumber: 'SN_OMNI_1001', dealerCode: 'DLR_OMNI_1' },
      { headers: { 'X-API-Key': rawKeyA } }
    );

    // Validate SN_OMNI_1001 again (Call 3 - ALREADY_VALIDATED)
    await axios.post(
      `${baseUrl}/api/v1/serial-validation/validate`,
      { materialCode: 'SOLAR_MOD_100', serialNumber: 'SN_OMNI_1001', dealerCode: 'DLR_OMNI_1' },
      { headers: { 'X-API-Key': rawKeyA } }
    );

    // Validate SN_OMNI_1002 with WRONG dealer (Call 4 - DEALER_MISMATCH)
    await axios.post(
      `${baseUrl}/api/v1/serial-validation/validate`,
      { materialCode: 'SOLAR_MOD_100', serialNumber: 'SN_OMNI_1002', dealerCode: 'DLR_WRONG_9' },
      { headers: { 'X-API-Key': rawKeyA } }
    );

    // Validate NON-EXISTENT serial (Call 5 - INVALID_SERIAL)
    await axios.post(
      `${baseUrl}/api/v1/serial-validation/validate`,
      { materialCode: 'SOLAR_MOD_100', serialNumber: 'SN_FAKE_9999', dealerCode: 'DLR_OMNI_1' },
      { headers: { 'X-API-Key': rawKeyA } }
    );

    // Query Analytics Endpoint
    const analyticsRes = await axios.get(
      `${baseUrl}/api/api-keys/${keyDocA.id}/analytics`,
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );

    assert(analyticsRes.status === 200, 'Fetched API key analytics endpoint');
    const metrics = analyticsRes.data.metrics;

    assert(metrics.totalRequests === 5, `Total Requests is exactly 5 (Received: ${metrics.totalRequests})`);
    assert(metrics.uniqueSerials === 3, `Unique Serials is exactly 3 (SN_1001, SN_1002, SN_FAKE_9999) - No Inflation on Duplicates (Received: ${metrics.uniqueSerials})`);
    assert(metrics.successfulValidations === 1, `Successful validations is 1 (Received: ${metrics.successfulValidations})`);
    assert(metrics.failedValidations === 4, `Failed validations is 4 (Received: ${metrics.failedValidations})`);
    assert(metrics.successRate === 20, `Success rate is 20.0% (Received: ${metrics.successRate}%)`);

    // 3. Outcome Breakdown Verification
    console.log('\n🔍 TEST GROUP 3: Validation Outcome Breakdown');
    const breakdown = analyticsRes.data.outcomeBreakdown;
    assert(breakdown.VALID === 1, 'Outcome VALID === 1');
    assert(breakdown.ALREADY_VALIDATED === 2, 'Outcome ALREADY_VALIDATED === 2');
    assert(breakdown.DEALER_MISMATCH === 1, 'Outcome DEALER_MISMATCH === 1');
    assert(breakdown.INVALID_SERIAL === 1, 'Outcome INVALID_SERIAL === 1');

    // 4. API List includes summary statistics
    console.log('\n📋 TEST GROUP 4: Company API List Summary Statistics');
    const listRes = await axios.get(
      `${baseUrl}/api/api-keys`,
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );

    const listedKey = listRes.data.find(k => k.id === keyDocA.id);
    assert(listedKey !== undefined, 'Found key in company API list');
    assert(listedKey.totalRequests === 5, 'List shows totalRequests = 5');
    assert(listedKey.uniqueSerials === 3, 'List shows uniqueSerials = 3');
    assert(listedKey.successful === 1, 'List shows successful = 1');
    assert(listedKey.failed === 4, 'List shows failed = 4');

    // 5. Cross-Tenant Analytics Isolation
    console.log('\n🔒 TEST GROUP 5: Cross-Tenant Analytics Boundary');
    let vortexBlocked = false;
    try {
      await axios.get(
        `${baseUrl}/api/api-keys/${keyDocA.id}/analytics`,
        { headers: { 'Authorization': `Bearer ${tokenB}` } }
      );
    } catch (err) {
      vortexBlocked = (err.response.status === 404);
    }
    assert(vortexBlocked === true, 'Company Vortex is BLOCKED from viewing Company Omni analytics');

    // 6. Super Admin Platform Aggregations (Zero Raw Secret/Serial Exposure)
    console.log('\n🏢 TEST GROUP 6: Super Admin Platform API Overview Reporting');
    const superOverviewRes = await axios.get(
      `${baseUrl}/api/api-keys/platform-overview`,
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );

    assert(superOverviewRes.status === 200, 'Super Admin fetched platform overview');
    const omniOverview = superOverviewRes.data.find(c => c.companyCode === 'OMNI');

    assert(omniOverview.totalApis === 1, 'Super Admin reports Omni totalApis = 1');
    assert(omniOverview.totalRequests === 5, 'Super Admin reports Omni totalRequests = 5');
    assert(omniOverview.uniqueSerials === 3, 'Super Admin reports Omni uniqueSerials = 3');
    assert(omniOverview.successfulValidations === 1, 'Super Admin reports Omni successfulValidations = 1');
    assert(omniOverview.failedValidations === 4, 'Super Admin reports Omni failedValidations = 4');
    assert(omniOverview.key === undefined && omniOverview.rawSerial === undefined, 'Zero raw secrets or raw serial numbers exposed in platform report');

    console.log('\n======================================================');
    console.log(`🏁 API USAGE & ANALYTICS RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Analytics test aborted on failure:', err);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runApiAnalyticsTests();
