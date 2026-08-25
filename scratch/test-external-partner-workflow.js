/**
 * Charlie's CRM — External Partner (Salesforce/Postman) End-to-End Simulation Test
 * 
 * Simulates a realistic external partner interaction over HTTP:
 * 1. Company Creation in CRM
 * 2. API Key Generation in CRM
 * 3. Handoff to External Client (Salesforce)
 * 4. HTTP POST /api/v1/serial-validation/validate
 * 5. Send valid Material + Serial + Dealer -> Receive 200 VALID
 * 6. Send wrong dealer -> Receive 200 DEALER_MISMATCH
 * 7. Revoke API key in CRM
 * 8. Send HTTP request again -> Receive 401 UNAUTHORIZED / API_KEY_INVALID_OR_REVOKED
 */
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const axios = require('axios');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Company = require('../models/Company');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const SerialRegistry = require('../models/SerialRegistry');

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

async function runPartnerWorkflowSimulation() {
  console.log('🚀 Starting External Partner (Salesforce / Postman) E2E Simulation...\n');

  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
  } else {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }

  // Setup standalone test Express server with the exact routing architecture
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
    // -----------------------------------------------------------
    // STEP 1: Create Company in CRM
    // -----------------------------------------------------------
    console.log('🏢 STEP 1: Provision Company "Acme Corp" & Admin User');
    const compAcme = await new Company({
      name: 'Acme Corporation Ltd',
      code: 'ACME',
      subdomain: 'acme',
      status: 'ACTIVE',
      isActive: true
    }).save();

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);
    const userAcmeAdmin = await new User({
      name: 'Acme Admin',
      email: 'admin@acme.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compAcme._id
    }).save();

    const adminToken = jwt.sign(
      { id: userAcmeAdmin._id, role: userAcmeAdmin.role, companyId: compAcme._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    assert(compAcme._id && userAcmeAdmin._id, 'Company Acme provisioned and admin JWT issued');

    // Register a valid physical unit in Acme's registry
    const registeredUnit = await new SerialRegistry({
      companyId: compAcme._id,
      materialCode: 'MC_SOLAR_500W',
      serialNumber: 'SN_ACME_998877',
      dealerCode: 'DLR_MUMBAI_01',
      currentHolderType: 'DEALER',
      currentHolderId: 'DLR_MUMBAI_01',
      status: 'IN_STOCK'
    }).save();

    assert(registeredUnit._id, 'Physical unit registered in Acme company database');

    // -----------------------------------------------------------
    // STEP 2 & 3: Generate API Key & Copy Integration Details
    // -----------------------------------------------------------
    console.log('\n🔑 STEP 2 & 3: Company Admin Generates API Key in CRM');
    const createKeyRes = await axios.post(
      `${baseUrl}/api/api-keys`,
      {
        name: 'Salesforce Production Connector',
        feature: 'Serial Number Validation',
        description: 'Used by external Salesforce CRM to validate dealer dispatches'
      },
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    assert(createKeyRes.status === 201, 'API key creation returned HTTP 201');
    const generatedKey = createKeyRes.data.apiKey.key;
    const generatedKeyId = createKeyRes.data.apiKey.id;
    const endpointPath = createKeyRes.data.integration.endpoint;

    assert(Boolean(generatedKey) && generatedKey.startsWith('ik_'), `Generated valid secret API key: ${generatedKey.substring(0, 10)}...`);
    assert(createKeyRes.data.integration.method === 'POST', 'Integration package includes HTTP method POST');
    assert(createKeyRes.data.integration.sampleBody.materialCode !== undefined, 'Integration package includes sample request payload');

    // -----------------------------------------------------------
    // STEP 4, 5 & 6: External Client makes POST request with Valid Data
    // -----------------------------------------------------------
    console.log('\n🌐 STEP 4, 5 & 6: External Partner (Salesforce) sends VALID Serial Verification Request');
    const validPayload = {
      materialCode: 'MC_SOLAR_500W',
      serialNumber: 'SN_ACME_998877',
      dealerCode: 'DLR_MUMBAI_01'
    };

    const validReqRes = await axios.post(
      `${baseUrl}/api/v1/serial-validation/validate`,
      validPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': generatedKey
        }
      }
    );

    assert(validReqRes.status === 200, 'External validation returned HTTP 200 OK');
    const validData = validReqRes.data;

    // Strict machine-readable format verification
    assert(validData.valid === true, 'Response valid === true');
    assert(validData.verified === true, 'Response verified === true');
    assert(validData.canProceed === true, 'Response canProceed === true');
    assert(validData.resultCode === 'VALID', 'Response machine-readable resultCode === "VALID"');
    assert(validData.status === 'VALID', 'Response status === "VALID"');
    assert(validData.statusCode === '0', 'Response statusCode === "0"');
    assert(typeof validData.message === 'string', `Response message is human-readable: "${validData.message}"`);
    assert(typeof validData.validatedAt === 'string', 'Response contains timestamp validatedAt');

    // -----------------------------------------------------------
    // STEP 7 & 8: External Client sends WRONG Dealer Code
    // -----------------------------------------------------------
    console.log('\n⚠️ STEP 7 & 8: External Partner sends MISMATCHED Dealer Code');
    const wrongDealerPayload = {
      materialCode: 'MC_SOLAR_500W',
      serialNumber: 'SN_ACME_998877',
      dealerCode: 'DLR_UNAUTHORIZED_99'
    };

    const mismatchRes = await axios.post(
      `${baseUrl}/api/v1/serial-validation/validate`,
      wrongDealerPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': generatedKey
        }
      }
    );

    assert(mismatchRes.status === 200, 'Dealer mismatch returned HTTP 200 with failure result object');
    const mismatchData = mismatchRes.data;

    assert(mismatchData.valid === false, 'Response valid === false on dealer mismatch');
    assert(mismatchData.verified === false, 'Response verified === false on dealer mismatch');
    assert(mismatchData.canProceed === false, 'Response canProceed === false on dealer mismatch');
    assert(mismatchData.resultCode === 'DEALER_MISMATCH', 'Response machine-readable resultCode === "DEALER_MISMATCH"');
    assert(mismatchData.statusCode === '-5', 'Response statusCode === "-5"');

    // -----------------------------------------------------------
    // STEP 9: Company Admin Revokes API Key in CRM
    // -----------------------------------------------------------
    console.log('\n🚫 STEP 9: Company Admin Revokes the API Key in CRM UI');
    const revokeRes = await axios.patch(
      `${baseUrl}/api/api-keys/${generatedKeyId}/revoke`,
      {},
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    assert(revokeRes.status === 200, 'API key revocation returned HTTP 200');
    assert(revokeRes.data.apiKey.status === 'REVOKED', 'API key status confirmed as REVOKED');

    // -----------------------------------------------------------
    // STEP 10 & 11: External Client tries to use Revoked API Key
    // -----------------------------------------------------------
    console.log('\n🛑 STEP 10 & 11: External Partner attempts to use Revoked Key (Expected 401)');
    let blockedResponse = null;
    try {
      await axios.post(
        `${baseUrl}/api/v1/serial-validation/validate`,
        validPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': generatedKey
          }
        }
      );
    } catch (err) {
      blockedResponse = err.response;
    }

    assert(blockedResponse !== null, 'External request with revoked key was blocked');
    assert(blockedResponse.status === 401, `Returned HTTP 401 Unauthorized (Received: ${blockedResponse.status})`);
    assert(blockedResponse.data.valid === false, 'Response valid === false');
    assert(blockedResponse.data.code === 'API_KEY_INVALID_OR_REVOKED', 'Response machine-readable code === "API_KEY_INVALID_OR_REVOKED"');
    assert(blockedResponse.data.status === 'UNAUTHORIZED', 'Response status === "UNAUTHORIZED"');

    console.log('\n======================================================');
    console.log(`🏁 PARTNER WORKFLOW SIMULATION: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Partner simulation test aborted on failure:', err);
  } finally {
    if (server) server.close();
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
    }
  }
}

runPartnerWorkflowSimulation();
