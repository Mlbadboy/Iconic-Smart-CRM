const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

// Ensure local tenant registry mode for multi-tenant E2E tests
delete process.env.SERIAL_VALIDATION_ACCESS_KEY;
delete process.env.SERIAL_VALIDATION_URL;

const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const Product = require('../models/Product');
const SerialRegistry = require('../models/SerialRegistry');
const StockTransfer = require('../models/StockTransfer');
const StockLedger = require('../models/StockLedger');
const ApiKey = require('../models/ApiKey');
const stockTransferService = require('../services/stockTransferService');
const { validateSerialNumber } = require('../services/serialValidationService');
const { hasPermission, applyDataScope } = require('../middleware/rbac');

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function runE2ETests() {
  console.log('🚀 Starting Multi-Tenant & Multi-Company E2E Verification Suite...\n');
  
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    console.log(`✅ In-Memory Test Database ready at: ${uri}\n`);
    await mongoose.connect(uri);
  } catch (err) {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/iconic-crm';
    await mongoose.connect(MONGO_URI);
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Tenant Foundation & Company Creation
    // ----------------------------------------------------
    console.log('📦 TEST GROUP 1: Multi-Company Setup & Tenant Isolation');
    
    // Clean previous test data
    await Promise.all([
      Company.deleteMany({ code: { $in: ['TEST_COMP_A', 'TEST_COMP_B'] } }),
      User.deleteMany({ email: { $in: ['admin_a@test.com', 'admin_b@test.com', 'super@test.com'] } }),
      Role.deleteMany({ name: 'Test Sales Lead' }),
      SerialRegistry.deleteMany({ serialNumber: { $in: ['TEST_SN_001', 'TEST_SN_002', 'TEST_SN_003'] } }),
      ApiKey.deleteMany({ key: { $in: ['key_comp_a_123', 'key_comp_b_456'] } })
    ]);

    const compA = new Company({
      name: 'Company Alpha',
      code: 'TEST_COMP_A',
      contactEmail: 'contact@alpha.com',
      isActive: true
    });
    await compA.save();

    const compB = new Company({
      name: 'Company Beta',
      code: 'TEST_COMP_B',
      contactEmail: 'contact@beta.com',
      isActive: true
    });
    await compB.save();

    assert(compA._id && compB._id, 'Company Alpha and Company Beta created with distinct IDs');

    // Create Super Admin, Company Admin A, and Company Admin B
    const hash = await bcrypt.hash('Password@123', 10);
    const superAdmin = await new User({
      name: 'Global Super Admin',
      email: 'super@test.com',
      password: hash,
      role: 'super-admin'
    }).save();

    const userA = await new User({
      name: 'Alpha Admin',
      email: 'admin_a@test.com',
      password: hash,
      role: 'company-admin',
      companyId: compA._id
    }).save();

    const userB = await new User({
      name: 'Beta Admin',
      email: 'admin_b@test.com',
      password: hash,
      role: 'company-admin',
      companyId: compB._id
    }).save();

    assert(userA.companyId.toString() === compA._id.toString(), 'User A is bound strictly to Company Alpha');
    assert(userB.companyId.toString() === compB._id.toString(), 'User B is bound strictly to Company Beta');

    // ----------------------------------------------------
    // TEST 2: Dynamic Role Builder & Scoping
    // ----------------------------------------------------
    console.log('\n🔐 TEST GROUP 2: Dynamic RBAC & Permission Scoping');

    const roleAlpha = new Role({
      companyId: compA._id,
      name: 'Test Sales Lead',
      description: 'Regional Sales Lead for Alpha',
      permissions: ['order.view', 'order.create', 'inventory.transfer'],
      scopeType: 'REGION',
      scopeValues: ['North', 'West']
    });
    await roleAlpha.save();

    assert(hasPermission({ role: 'super-admin' }, 'any.action'), 'Super Admin has universal wildcard access');
    assert(hasPermission({ role: 'company-admin' }, 'any.action'), 'Company Admin has wildcard access in company');
    assert(hasPermission({ permissions: roleAlpha.permissions }, 'order.view'), 'Custom role has order.view permission');
    assert(!hasPermission({ permissions: roleAlpha.permissions }, 'user.disable'), 'Custom role denied user.disable permission');

    // Test Data Scoping
    const mockReqWithScope = {
      user: {
        id: userA._id,
        role: 'sales-manager',
        scopeType: 'REGION',
        scopeValues: ['North', 'West']
      }
    };
    const scopedFilter = applyDataScope(mockReqWithScope, { status: 'active' });
    assert(scopedFilter.region && scopedFilter.region.$in.includes('North'), 'Data scope correctly filters query by authorized regions');

    // ----------------------------------------------------
    // TEST 3: Authoritative Product Units & Ingestion
    // ----------------------------------------------------
    console.log('\n🏷️ TEST GROUP 3: Individual Product Unit Registration');

    const unit1 = new SerialRegistry({
      companyId: compA._id,
      materialCode: 'SMART_TV_55',
      serialNumber: 'TEST_SN_001',
      qrCode: 'QR_TEST_001',
      currentHolderType: 'COMPANY',
      currentHolderId: compA._id.toString(),
      holderName: 'Alpha Warehouse',
      status: 'IN_STOCK'
    });
    await unit1.save();

    const unit2 = new SerialRegistry({
      companyId: compA._id,
      materialCode: 'SMART_TV_55',
      serialNumber: 'TEST_SN_002',
      qrCode: 'QR_TEST_002',
      currentHolderType: 'COMPANY',
      currentHolderId: compA._id.toString(),
      holderName: 'Alpha Warehouse',
      status: 'IN_STOCK'
    });
    await unit2.save();

    const unitB1 = new SerialRegistry({
      companyId: compB._id,
      materialCode: 'SMART_TV_55',
      serialNumber: 'TEST_SN_003',
      currentHolderType: 'COMPANY',
      currentHolderId: compB._id.toString(),
      status: 'IN_STOCK'
    });
    await unitB1.save();

    // Query inventory summary
    const compAInventory = await stockTransferService.getHolderInventory(compA._id, 'COMPANY', compA._id.toString());
    assert(compAInventory.totalAvailableUnits === 2, 'Company A has exactly 2 available units in warehouse');

    // Cross-tenant query check
    const compBQuery = await SerialRegistry.find({ companyId: compB._id });
    assert(compBQuery.length === 1 && compBQuery[0].serialNumber === 'TEST_SN_003', 'Company B query isolates Company B units only');

    // ----------------------------------------------------
    // TEST 4: Atomic Multi-Tier Stock Transfers & Ledger
    // ----------------------------------------------------
    console.log('\n🚚 TEST GROUP 4: Multi-Tier Stock Transfers & Movement Ledger');

    // Step 1: Transfer from Company Alpha to Distributor DIST_001
    const mockTransferReq = { user: { id: userA._id, role: 'company-admin' } };
    const transfer1 = await stockTransferService.initiateStockTransfer(mockTransferReq, {
      companyId: compA._id,
      materialCode: 'SMART_TV_55',
      fromHolderType: 'COMPANY',
      fromHolderId: compA._id.toString(),
      fromHolderName: 'Alpha HQ',
      toHolderType: 'DISTRIBUTOR',
      toHolderId: 'DIST_ALPHA_001',
      toHolderName: 'Metro Distributors',
      unitSerials: ['TEST_SN_001', 'TEST_SN_002'],
      notes: 'Initial dispatch to distributor'
    });

    assert(transfer1.status === 'PENDING', 'Transfer 1 created in PENDING state');

    // Verify units are marked IN_TRANSIT
    const inTransitUnits = await SerialRegistry.find({ serialNumber: { $in: ['TEST_SN_001', 'TEST_SN_002'] } });
    assert(inTransitUnits.every(u => u.status === 'IN_TRANSIT'), 'Units are locked in IN_TRANSIT status during dispatch');

    // Step 2: Accept transfer by Distributor
    const acceptedTransfer1 = await stockTransferService.acceptStockTransfer(mockTransferReq, transfer1._id);
    assert(acceptedTransfer1.status === 'ACCEPTED', 'Transfer 1 accepted successfully');

    const distUnits = await SerialRegistry.find({ serialNumber: { $in: ['TEST_SN_001', 'TEST_SN_002'] } });
    assert(distUnits.every(u => u.currentHolderType === 'DISTRIBUTOR' && u.currentHolderId === 'DIST_ALPHA_001' && u.status === 'IN_STOCK'),
      'Unit holders atomically updated to DISTRIBUTOR DIST_ALPHA_001');

    // Step 3: Distributor transfers 1 unit to Dealer DLR_001
    const transfer2 = await stockTransferService.initiateStockTransfer(mockTransferReq, {
      companyId: compA._id,
      materialCode: 'SMART_TV_55',
      fromHolderType: 'DISTRIBUTOR',
      fromHolderId: 'DIST_ALPHA_001',
      fromHolderName: 'Metro Distributors',
      toHolderType: 'DEALER',
      toHolderId: 'DLR_ALPHA_001',
      toHolderName: 'Star Electronics Dealer',
      unitSerials: ['TEST_SN_001'],
      notes: 'Transfer to retail dealer'
    });
    await stockTransferService.acceptStockTransfer(mockTransferReq, transfer2._id);

    const dealerUnit = await SerialRegistry.findOne({ serialNumber: 'TEST_SN_001' });
    assert(dealerUnit.currentHolderType === 'DEALER' && dealerUnit.currentHolderId === 'DLR_ALPHA_001' && dealerUnit.dealerCode === 'DLR_ALPHA_001',
      'Unit TEST_SN_001 is now held by DEALER DLR_ALPHA_001 with dealerCode set');

    // Verify Movement Ledger
    const ledger = await StockLedger.find({ companyId: compA._id, serialNumber: 'TEST_SN_001' }).sort({ timestamp: 1 });
    assert(ledger.length >= 4, `Immutable ledger recorded complete chronological movement history (${ledger.length} events)`);

    // ----------------------------------------------------
    // TEST 5: Tenant-Aware External Serial Validation API
    // ----------------------------------------------------
    console.log('\n🔍 TEST GROUP 5: Tenant-Aware Serial Validation API & Company API Keys');

    // Create Company A API Key
    const apiKeyA = new ApiKey({
      key: 'key_comp_a_123',
      name: 'Alpha Salesforce Key',
      companyId: compA._id,
      userId: userA._id,
      permissions: ['serial_validation.validate'],
      dealerScope: ['DLR_ALPHA_001']
    });
    await apiKeyA.save();

    // Create Company B API Key
    const apiKeyB = new ApiKey({
      key: 'key_comp_b_456',
      name: 'Beta Salesforce Key',
      companyId: compB._id,
      userId: userB._id,
      permissions: ['serial_validation.validate']
    });
    await apiKeyB.save();

    // 1. Company A Key validates Company A Serial at DLR_ALPHA_001 -> Expect VALID
    const reqA = { companyId: compA._id, user: { id: userA._id } };
    const valResult1 = await validateSerialNumber(reqA, {
      materialCode: 'SMART_TV_55',
      serialNumber: 'TEST_SN_001',
      dealerCode: 'DLR_ALPHA_001'
    });
    assert(valResult1.verified === true && valResult1.status === 'VALID', 'Company A Key validates Company A unit for registered dealer successfully');

    // 2. Company B Key attempts to validate Company A's serial -> Expect INVALID_SERIAL
    const reqB = { companyId: compB._id, user: { id: userB._id } };
    const valResult2 = await validateSerialNumber(reqB, {
      materialCode: 'SMART_TV_55',
      serialNumber: 'TEST_SN_001',
      dealerCode: 'DLR_ALPHA_001'
    });
    assert(valResult2.verified === false && valResult2.status === 'INVALID_SERIAL', 'Company B Key CANNOT see Company A serial (Zero Cross-Tenant Leakage)');

    // 3. Company A Key validates for incorrect dealer -> Expect DEALER_MISMATCH
    const valResult3 = await validateSerialNumber(reqA, {
      materialCode: 'SMART_TV_55',
      serialNumber: 'TEST_SN_001',
      dealerCode: 'DLR_WRONG_999'
    });
    assert(valResult3.verified === false && valResult3.status === 'DEALER_MISMATCH', 'Validation fails with DEALER_MISMATCH when dealer does not own unit');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n======================================================');
    console.log(`🏁 E2E MULTI-TENANT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

runE2ETests();
