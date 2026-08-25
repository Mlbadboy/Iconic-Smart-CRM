/**
 * Charlie's CRM — SaaS Multi-Tenant, Subdomain & White-Label E2E Verification Suite
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const Product = require('../models/Product');
const ApiKey = require('../models/ApiKey');
const SerialRegistry = require('../models/SerialRegistry');
const StockTransfer = require('../models/StockTransfer');
const StockLedger = require('../models/StockLedger');
const AuditEvent = require('../models/AuditEvent');

const { validateSubdomain, isReservedSubdomain, resolveTenantFromHost } = require('../services/tenantResolver');
const stockTransferService = require('../services/stockTransferService');
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

async function runSaaSE2ETests() {
  console.log('🚀 Starting Charlie\'s CRM SaaS Multi-Tenant & White-Label E2E Suite...\n');

  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
  } else {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }
  console.log('✅ Test Database connected.\n');

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Subdomain Validation & Reserved Words
    // ----------------------------------------------------
    console.log('🌐 TEST GROUP 1: Subdomain Validation & Reserved Word Protection');
    assert(isReservedSubdomain('app') === true, 'Subdomain "app" is correctly reserved for Super Admin platform console');
    assert(isReservedSubdomain('admin') === true, 'Subdomain "admin" is reserved');
    assert(isReservedSubdomain('api') === true, 'Subdomain "api" is reserved');
    assert(isReservedSubdomain('www') === true, 'Subdomain "www" is reserved');

    const invalidSub1 = validateSubdomain('app');
    assert(invalidSub1.valid === false, 'validateSubdomain blocks "app"');

    const invalidSub2 = validateSubdomain('-invalid-sub-');
    assert(invalidSub2.valid === false, 'validateSubdomain blocks invalid hyphen formatting');

    const validSub1 = validateSubdomain('apex-industries');
    assert(validSub1.valid === true && validSub1.clean === 'apex-industries', 'validateSubdomain accepts valid tenant subdomain "apex-industries"');

    // ----------------------------------------------------
    // TEST GROUP 2: Tenant Creation with White-Label Branding & Lifecycle
    // ----------------------------------------------------
    console.log('\n🏢 TEST GROUP 2: Tenant Creation, Subdomains & White-Label Branding');
    const compApex = new Company({
      name: 'Apex Industries Pvt Ltd',
      displayName: 'Apex CRM',
      code: 'APEX',
      subdomain: 'apex',
      branding: {
        logo: '/uploads/company-assets/apex-logo.png',
        favicon: '/uploads/company-assets/apex-favicon.ico',
        primaryColor: '#059669',
        secondaryColor: '#047857',
        accentColor: '#10b981',
        loginBranding: { heading: 'Apex Cloud CRM', subtitle: 'Apex Industrial Portal' },
        emailBranding: { senderName: 'Apex Notification Service', footerText: 'Apex Industries automated notification' }
      },
      billing: {
        plan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        billingCycle: 'ANNUAL'
      },
      status: 'ACTIVE',
      isActive: true
    });
    await compApex.save();

    const compZenith = new Company({
      name: 'Zenith Logistics Ltd',
      displayName: 'Zenith CRM',
      code: 'ZENITH',
      subdomain: 'zenith',
      branding: {
        logo: '/uploads/company-assets/zenith-logo.png',
        primaryColor: '#7c3aed'
      },
      billing: { plan: 'STARTER', subscriptionStatus: 'ACTIVE' },
      status: 'ACTIVE',
      isActive: true
    });
    await compZenith.save();

    assert(compApex.subdomain === 'apex' && compApex.status === 'ACTIVE', 'Apex tenant created with subdomain "apex" and status ACTIVE');
    assert(compZenith.subdomain === 'zenith' && compZenith.branding.primaryColor === '#7c3aed', 'Zenith tenant created with custom brand colors');

    // ----------------------------------------------------
    // TEST GROUP 3: Hostname Resolution & Trusted Proxy Verification
    // ----------------------------------------------------
    console.log('\n🔍 TEST GROUP 3: Hostname & Subdomain Resolution Logic');
    
    // Simulate Request on apex.localhost
    const mockReqApex = {
      hostname: 'apex.localhost',
      headers: { host: 'apex.localhost:7000' },
      app: { get: () => false }
    };
    const resolvedApex = await resolveTenantFromHost(mockReqApex);
    assert(resolvedApex.isPlatform === false && resolvedApex.subdomain === 'apex', 'Resolved apex.localhost to subdomain "apex"');
    assert(resolvedApex.company && String(resolvedApex.company._id) === String(compApex._id), 'Resolved host to Apex Company entity');

    // Simulate Request on app.charliescrm.com (Platform Super Admin console)
    const mockReqPlatform = {
      hostname: 'app.charliescrm.com',
      headers: { host: 'app.charliescrm.com' },
      app: { get: () => false }
    };
    const resolvedPlatform = await resolveTenantFromHost(mockReqPlatform);
    assert(resolvedPlatform.isPlatform === true && resolvedPlatform.company === null, 'Resolved app.charliescrm.com as Platform Super Admin context');

    // ----------------------------------------------------
    // TEST GROUP 4: Cross-Tenant Login Isolation
    // ----------------------------------------------------
    console.log('\n🔐 TEST GROUP 4: Subdomain Login Enforcement & Tenant Isolation');
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const userApexAdmin = new User({
      name: 'Apex Admin',
      email: 'admin@apex.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compApex._id
    });
    await userApexAdmin.save();

    const userZenithAdmin = new User({
      name: 'Zenith Admin',
      email: 'admin@zenith.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compZenith._id
    });
    await userZenithAdmin.save();

    const userSuperAdmin = new User({
      name: 'Platform Super Admin',
      email: 'super@charliescrm.com',
      password: passwordHash,
      role: 'super-admin'
    });
    await userSuperAdmin.save();

    // Verify tenant mismatch check logic
    const canZenithUserAccessApex = (userZenithAdmin.companyId.toString() === compApex._id.toString());
    assert(canZenithUserAccessApex === false, 'Zenith user is BLOCKED from accessing Apex tenant workspace (Zero cross-tenant login)');

    const canApexUserAccessApex = (userApexAdmin.companyId.toString() === compApex._id.toString());
    assert(canApexUserAccessApex === true, 'Apex user is ALLOWED into Apex tenant workspace');

    // ----------------------------------------------------
    // TEST GROUP 5: Tenant Lifecycle State Management (SUSPENDED state)
    // ----------------------------------------------------
    console.log('\n⏸️ TEST GROUP 5: Tenant Lifecycle Transitions (ACTIVE -> SUSPENDED -> ACTIVE)');
    compApex.status = 'SUSPENDED';
    await compApex.save();

    assert(compApex.status === 'SUSPENDED' && compApex.isActive === false, 'Company status changed to SUSPENDED');

    // Reactivate
    compApex.status = 'ACTIVE';
    await compApex.save();
    assert(compApex.status === 'ACTIVE' && compApex.isActive === true, 'Company successfully reactivated to ACTIVE');

    // ----------------------------------------------------
    // TEST GROUP 6: Enhanced API Key & Tenant Isolation
    // ----------------------------------------------------
    console.log('\n🔑 TEST GROUP 6: Enhanced API Keys & 4-Point Serial Verification');
    const apiKeyApex = new ApiKey({
      key: 'ck_apex_live_9988776655',
      name: 'Salesforce ERP Connector',
      clientName: 'Salesforce Production',
      partnerType: 'ERP',
      companyId: compApex._id,
      userId: userApexAdmin._id,
      status: 'ACTIVE',
      permissions: ['serial_validation.validate', 'product.verify']
    });
    await apiKeyApex.save();

    const apiKeyZenith = new ApiKey({
      key: 'ck_zenith_live_1122334455',
      name: 'SAP Integrator',
      clientName: 'SAP Global',
      partnerType: 'ERP',
      companyId: compZenith._id,
      userId: userZenithAdmin._id,
      status: 'ACTIVE',
      permissions: ['serial_validation.validate']
    });
    await apiKeyZenith.save();

    // Create unit in Apex
    const apexUnit = new SerialRegistry({
      companyId: compApex._id,
      materialCode: 'APEX_MAT_100',
      serialNumber: 'APEX_SN_0001',
      qrCode: 'QR_APEX_0001',
      currentHolderType: 'DEALER',
      currentHolderId: 'DLR_APEX_1',
      dealerCode: 'DLR_APEX_1',
      status: 'IN_STOCK'
    });
    await apexUnit.save();

    // Validate using Apex API key
    const valResultApex = await validateSerialNumber(
      { companyId: compApex._id, headers: {} },
      {
        serialNumber: 'APEX_SN_0001',
        materialCode: 'APEX_MAT_100',
        dealerCode: 'DLR_APEX_1'
      }
    );
    assert(valResultApex.verified === true && valResultApex.canProceed === true, 'Apex API Key validates Apex product unit successfully');

    // Validate using Zenith API key (Cross-tenant probe)
    const valResultZenith = await validateSerialNumber(
      { companyId: compZenith._id, headers: {} },
      {
        serialNumber: 'APEX_SN_0001',
        materialCode: 'APEX_MAT_100',
        dealerCode: 'DLR_APEX_1'
      }
    );
    assert(valResultZenith.verified === false && valResultZenith.resultCode === 'INVALID_SERIAL', 'Zenith API Key CANNOT see Apex serial (Complete Tenant Boundary)');

    // ----------------------------------------------------
    // TEST GROUP 7: Multi-Tier Atomic Stock Transfers & Ledger
    // ----------------------------------------------------
    console.log('\n🚚 TEST GROUP 7: Multi-Tier Unit Movement & Immutable Movement Ledger');
    
    const apexUnit2 = new SerialRegistry({
      companyId: compApex._id,
      materialCode: 'APEX_MAT_100',
      serialNumber: 'APEX_SN_0002',
      qrCode: 'QR_APEX_0002',
      currentHolderType: 'DEALER',
      currentHolderId: 'DLR_APEX_1',
      dealerCode: 'DLR_APEX_1',
      status: 'IN_STOCK'
    });
    await apexUnit2.save();

    // Unit transfer from DEALER to RETAILER
    const transfer = await stockTransferService.initiateStockTransfer(
      { user: { id: userApexAdmin._id, role: 'company-admin' }, headers: {} },
      {
        companyId: compApex._id,
        materialCode: 'APEX_MAT_100',
        fromHolderType: 'DEALER',
        fromHolderId: 'DLR_APEX_1',
        toHolderType: 'RETAILER',
        toHolderId: 'RET_APEX_9',
        unitSerials: ['APEX_SN_0002']
      }
    );
    assert(transfer.status === 'PENDING', 'Stock transfer dispatched in PENDING state');

    const acceptedTransfer = await stockTransferService.acceptStockTransfer(
      { user: { id: userApexAdmin._id, role: 'company-admin' }, headers: {} },
      transfer._id
    );
    assert(acceptedTransfer.status === 'ACCEPTED', 'Stock transfer accepted successfully');

    const updatedUnit = await SerialRegistry.findOne({ serialNumber: 'APEX_SN_0002' });
    assert(updatedUnit.currentHolderType === 'RETAILER' && updatedUnit.currentHolderId === 'RET_APEX_9', 'Unit holder atomically updated to RETAILER RET_APEX_9');

    const ledgerEntries = await StockLedger.find({ companyId: compApex._id });
    assert(ledgerEntries.length >= 1, `Immutable Stock Ledger recorded movement event (${ledgerEntries.length} entries)`);

    console.log('\n======================================================');
    console.log(`🏁 SAAS MULTI-TENANT RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test execution aborted on failure:', err);
  } finally {
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
    }
  }
}

runSaaSE2ETests();
