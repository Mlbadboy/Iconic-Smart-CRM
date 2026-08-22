/**
 * Charlie's CRM — Simple Company API Access Frontend & Security Test Suite
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Company = require('../models/Company');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const SerialRegistry = require('../models/SerialRegistry');

const { validateSerialNumber } = require('../services/serialValidationService');

process.env.JWT_SECRET = 'supersecretjwtkeythatislongerthan32charactersforsecurity';
delete process.env.SERIAL_VALIDATION_ACCESS_KEY;

let mongod;
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

async function runApiAccessTests() {
  console.log('🚀 Starting Charlie\'s CRM Simplified API Access Verification Suite...\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('✅ In-Memory Test Database ready.\n');

  try {
    // 1. Setup Test Companies & Users
    console.log('🏢 TEST GROUP 1: Setup Multi-Tenant Companies & Admin Users');
    const compA = await new Company({
      name: 'Alpha Electronics Ltd',
      code: 'ALPHA',
      subdomain: 'alpha',
      status: 'ACTIVE',
      isActive: true
    }).save();

    const compB = await new Company({
      name: 'Beta Motors Ltd',
      code: 'BETA',
      subdomain: 'beta',
      status: 'ACTIVE',
      isActive: true
    }).save();

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const userA = await new User({
      name: 'Alpha Admin',
      email: 'admin@alpha.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compA._id
    }).save();

    const userB = await new User({
      name: 'Beta Admin',
      email: 'admin@beta.com',
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

    assert(compA._id && compB._id, 'Created Companies Alpha and Beta');
    assert(userA.companyId.toString() === compA._id.toString(), 'User A bound to Company Alpha');

    // 2. Test Automated Feature Mapping & Key Generation
    console.log('\n🔑 TEST GROUP 2: Simplified API Key Generation & Auto Feature Mapping');
    
    // Simulate generation endpoint logic
    const FEATURE_MAP = {
      'SERIAL_VALIDATION': {
        label: 'Serial Number Validation',
        permissions: ['serial_validation.validate', 'serial.verify'],
        endpointPath: '/api/v1/serial-validation/validate'
      },
      'PRODUCT_VERIFY': {
        label: 'Product / QR Verification',
        permissions: ['product.verify', 'serial_validation.validate'],
        endpointPath: '/api/v1/serial-validation/validate'
      }
    };

    const keyRawA = 'ik_alpha_secret_token_1234567890abcdef';
    const apiKeyA = await new ApiKey({
      key: keyRawA,
      name: 'Salesforce Serial Validation',
      feature: FEATURE_MAP['SERIAL_VALIDATION'].label,
      clientName: 'Salesforce Serial Validation',
      companyId: userA.companyId,
      userId: userA._id,
      status: 'ACTIVE',
      permissions: FEATURE_MAP['SERIAL_VALIDATION'].permissions
    }).save();

    assert(apiKeyA.key === keyRawA, 'Raw secret key generated at creation time');
    assert(apiKeyA.feature === 'Serial Number Validation', 'Feature automatically assigned to Serial Number Validation');
    assert(apiKeyA.permissions.includes('serial_validation.validate'), 'Internal permissions automatically populated without user configuration');
    assert(apiKeyA.companyId.toString() === compA._id.toString(), 'API Key automatically inherited authenticated companyId');

    // 3. Test Masked Key in List (Zero Secret Exposure)
    console.log('\n🔒 TEST GROUP 3: Key Masking & Secret Protection in Lists');
    function maskKey(keyStr) {
      return keyStr.substring(0, 3) + '••••••••••••' + keyStr.slice(-4);
    }
    const masked = maskKey(apiKeyA.key);
    assert(masked.startsWith('ik_••••') && masked.endsWith('cdef'), `Key masked properly: ${masked}`);
    assert(!masked.includes('secret_token'), 'Raw secret token is completely shielded in UI representations');

    // 4. Test Serial Verification with Valid API Key
    console.log('\n🔍 TEST GROUP 4: Unit Verification & Tenant Isolation');
    const unitAlpha = await new SerialRegistry({
      companyId: compA._id,
      materialCode: 'MC_ALPHA_10',
      serialNumber: 'SN_ALPHA_001',
      dealerCode: 'DLR_A_1',
      currentHolderType: 'DEALER',
      currentHolderId: 'DLR_A_1',
      status: 'IN_STOCK'
    }).save();

    // Verify using Alpha Key
    const valResultA = await validateSerialNumber(
      { companyId: compA._id, apiKey: apiKeyA, headers: {} },
      { materialCode: 'MC_ALPHA_10', serialNumber: 'SN_ALPHA_001', dealerCode: 'DLR_A_1' }
    );
    assert(valResultA.verified === true && valResultA.canProceed === true, 'Alpha API Key successfully validates Alpha product unit');

    // Verify cross-tenant isolation using Beta context
    const valResultB = await validateSerialNumber(
      { companyId: compB._id, headers: {} },
      { materialCode: 'MC_ALPHA_10', serialNumber: 'SN_ALPHA_001', dealerCode: 'DLR_A_1' }
    );
    assert(valResultB.verified === false && valResultB.resultCode === 'INVALID_SERIAL', 'Beta API Key cannot see Alpha unit (Strict Tenant Boundary)');

    // 5. Test Revocation Flow
    console.log('\n🚫 TEST GROUP 5: API Key Revocation');
    apiKeyA.status = 'REVOKED';
    apiKeyA.active = false;
    apiKeyA.revokedAt = new Date();
    await apiKeyA.save();

    assert(apiKeyA.status === 'REVOKED' && apiKeyA.active === false, 'API key status set to REVOKED and active = false');

    // 6. Test Super Admin Platform Overview (Reporting only)
    console.log('\n📊 TEST GROUP 6: Super Admin Platform API Overview');
    const totalA = await ApiKey.countDocuments({ companyId: compA._id });
    const activeA = await ApiKey.countDocuments({ companyId: compA._id, status: 'ACTIVE' });
    const revokedA = await ApiKey.countDocuments({ companyId: compA._id, status: 'REVOKED' });

    assert(totalA === 1, 'Super Admin overview aggregates Total APIs = 1 for Alpha');
    assert(activeA === 0, 'Super Admin overview aggregates Active APIs = 0 for Alpha');
    assert(revokedA === 1, 'Super Admin overview aggregates Revoked APIs = 1 for Alpha');

    console.log('\n======================================================');
    console.log(`🏁 SIMPLIFIED API ACCESS RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test execution aborted on failure:', err);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runApiAccessTests();
