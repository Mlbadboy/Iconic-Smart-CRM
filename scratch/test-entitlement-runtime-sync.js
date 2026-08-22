/**
 * Charlie's CRM — Feature Entitlement Runtime Sync & Behavioral Verification Suite (Tests A-J)
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
const Order = require('../models/Order');

// Route imports
const authRouter = require('../routes/auth');
const dashboardRouter = require('../routes/dashboard');
const leadsRouter = require('../routes/leads');
const ordersRouter = require('../routes/orders');
const productsRouter = require('../routes/products');
const serialRegistryRouter = require('../routes/serialRegistry');
const stockTransfersRouter = require('../routes/stockTransfers');
const serialValidationRouter = require('../routes/serialValidation');
const serviceRequestsRouter = require('../routes/serviceRequests');
const marketingRouter = require('../routes/marketing');
const beatTrackerRouter = require('../routes/beatTracker');
const deliveriesRouter = require('../routes/deliveries');
const reportsRouter = require('../routes/reports');
const apiKeysRouter = require('../routes/apiKeys');
const tenantControlRouter = require('../routes/tenantControl');
const tenantRouter = require('../routes/tenant');

process.env.JWT_SECRET = 'supersecretjwtkeythatislongerthan32charactersforsecurity';

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

async function runRuntimeSyncTests() {
  console.log('🚀 Starting Charlie\'s CRM Entitlement Runtime Sync Verification (Tests A - J)...\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());

  // Mount API routes
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/v1/serial-registry', serialRegistryRouter);
  app.use('/api/stock-transfers', stockTransfersRouter);
  app.use('/api/serial-validation', serialValidationRouter);
  app.use('/api/service-requests', serviceRequestsRouter);
  app.use('/api/marketing', marketingRouter);
  app.use('/api/beat-tracker', beatTrackerRouter);
  app.use('/api/deliveries', deliveriesRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/api-keys', apiKeysRouter);
  app.use('/api/tenant-control', tenantControlRouter);
  app.use('/api/tenant', tenantRouter);

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
    // Setup Super Admin, Company A (Acme), and Company B (BetaCorp)
    const compA = await new Company({
      name: 'Acme Enterprise',
      code: 'ACME',
      subdomain: 'acme',
      status: 'ACTIVE',
      isActive: true,
      billing: { plan: 'ENTERPRISE' },
      features: {
        dashboard: true,
        sales: true,
        customers: true,
        orders: true,
        products: true,
        inventory: true,
        distribution: true,
        serial_validation: true,
        qr_verification: true,
        service: true,
        warranty: true,
        marketing: true,
        finance: true,
        field_force: true,
        logistics: true,
        reports: true,
        api_access: true,
        analytics: true
      }
    }).save();

    const compB = await new Company({
      name: 'Beta Global',
      code: 'BETA',
      subdomain: 'beta',
      status: 'ACTIVE',
      isActive: true,
      billing: { plan: 'STARTER' },
      features: {
        dashboard: true,
        sales: true,
        customers: true,
        orders: true,
        products: true,
        inventory: false,
        distribution: false,
        serial_validation: false,
        qr_verification: false,
        service: false,
        warranty: false,
        marketing: false,
        finance: false,
        field_force: false,
        logistics: false,
        reports: true,
        api_access: false,
        analytics: false
      }
    }).save();

    const passwordHash = await bcrypt.hash('SecurePass123!', 10);
    const userA = await new User({
      name: 'Acme Admin',
      email: 'admin@acme.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compA._id
    }).save();

    const userARestricted = await new User({
      name: 'Acme Sales User',
      email: 'sales@acme.com',
      password: passwordHash,
      role: 'sales', // No service permissions
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
      name: 'Platform Super Admin',
      email: 'super@charliescrm.com',
      password: passwordHash,
      role: 'super-admin'
    }).save();

    // ----------------------------------------------------
    // TEST A: Feature enabled -> Company login -> visible -> API accessible
    // ----------------------------------------------------
    console.log('📌 TEST A: Feature enabled -> Company login -> API accessible');
    const loginARes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'admin@acme.com',
      password: 'SecurePass123!'
    });
    assert(loginARes.status === 200, 'Company A login successful');
    assert(loginARes.data.user.company.features.service === true, 'Login response contains service: true');
    assert(loginARes.data.user.company.features.marketing === true, 'Login response contains marketing: true');

    const tokenA = loginARes.data.token;
    const entitlementsA = await axios.get(`${baseUrl}/api/tenant/entitlements`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(entitlementsA.data.features.service === true, 'GET /api/tenant/entitlements returns service: true');
    assert(entitlementsA.data.features.marketing === true, 'GET /api/tenant/entitlements returns marketing: true');

    const serviceApiAllowed = await axios.get(`${baseUrl}/api/service-requests`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(serviceApiAllowed.status === 200, 'Service API is accessible when enabled (HTTP 200)');

    // ----------------------------------------------------
    // TEST B: Feature disabled -> direct API returns 403 FEATURE_NOT_ENABLED
    // ----------------------------------------------------
    console.log('\n📌 TEST B: Feature disabled on BetaCorp -> API returns 403 FEATURE_NOT_ENABLED');
    const loginBRes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'admin@beta.com',
      password: 'SecurePass123!'
    });
    const tokenB = loginBRes.data.token;
    assert(loginBRes.data.user.company.features.service === false, 'Beta login returns service: false');

    let betaBlocked = false;
    try {
      await axios.get(`${baseUrl}/api/service-requests`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
    } catch (err) {
      betaBlocked = (err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_ENABLED');
    }
    assert(betaBlocked === true, 'BetaCorp service request is blocked with 403 FEATURE_NOT_ENABLED');

    // ----------------------------------------------------
    // TEST C: Super Admin changes ON -> OFF -> logout/login Company -> feature disappears
    // ----------------------------------------------------
    console.log('\n📌 TEST C: Super Admin disables Service & Marketing for Acme -> Relogin Acme -> Features Disabled');
    const superLoginRes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'super@charliescrm.com',
      password: 'SecurePass123!'
    });
    const superToken = superLoginRes.data.token;

    // Super Admin disables service and marketing for Acme
    const disableFeatRes = await axios.patch(
      `${baseUrl}/api/tenant-control/${compA._id}/features`,
      { features: { service: false, marketing: false } },
      { headers: { 'Authorization': `Bearer ${superToken}` } }
    );
    assert(disableFeatRes.status === 200, 'Super Admin saved feature toggle');
    assert(disableFeatRes.data.features.service === false, 'Super Admin confirmed service: false in DB');
    assert(disableFeatRes.data.features.marketing === false, 'Super Admin confirmed marketing: false in DB');

    // Verify DB persistence directly
    const compAFromDb = await Company.findById(compA._id).lean();
    assert(compAFromDb.features.service === false, 'Authoritative Database reflects service: false');
    assert(compAFromDb.features.marketing === false, 'Authoritative Database reflects marketing: false');

    // Relogin as Acme
    const reloginARes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'admin@acme.com',
      password: 'SecurePass123!'
    });
    assert(reloginARes.data.user.company.features.service === false, 'Acme relogin receives fresh service: false');
    assert(reloginARes.data.user.company.features.marketing === false, 'Acme relogin receives fresh marketing: false');

    const freshTokenA = reloginARes.data.token;
    let acmeServiceBlocked = false;
    try {
      await axios.get(`${baseUrl}/api/service-requests`, {
        headers: { 'Authorization': `Bearer ${freshTokenA}` }
      });
    } catch (err) {
      acmeServiceBlocked = (err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_ENABLED');
    }
    assert(acmeServiceBlocked === true, 'Acme direct Service API is blocked with 403 FEATURE_NOT_ENABLED');

    // ----------------------------------------------------
    // TEST D: Super Admin changes OFF -> ON -> logout/login Company -> feature appears
    // ----------------------------------------------------
    console.log('\n📌 TEST D: Super Admin re-enables Service for Acme -> Relogin Acme -> Feature Active');
    await axios.patch(
      `${baseUrl}/api/tenant-control/${compA._id}/features`,
      { features: { service: true, marketing: true } },
      { headers: { 'Authorization': `Bearer ${superToken}` } }
    );

    const reEnabledLoginA = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'admin@acme.com',
      password: 'SecurePass123!'
    });
    assert(reEnabledLoginA.data.user.company.features.service === true, 'Acme relogin receives re-enabled service: true');

    const activeServiceRes = await axios.get(`${baseUrl}/api/service-requests`, {
      headers: { 'Authorization': `Bearer ${reEnabledLoginA.data.token}` }
    });
    assert(activeServiceRes.status === 200, 'Acme service API accessible again (HTTP 200)');

    // ----------------------------------------------------
    // TEST E: Change feature while Company session exists -> Fresh call -> New state reflected
    // ----------------------------------------------------
    console.log('\n📌 TEST E: Super Admin toggles feature while session active -> GET /entitlements receives new state immediately');
    const existingSessionToken = reEnabledLoginA.data.token;

    // Super Admin toggles marketing: false while existing session is active
    await axios.patch(
      `${baseUrl}/api/tenant-control/${compA._id}/features`,
      { features: { marketing: false } },
      { headers: { 'Authorization': `Bearer ${superToken}` } }
    );

    // Existing session queries /entitlements with no-cache header
    const refreshEntitlementsRes = await axios.get(`${baseUrl}/api/tenant/entitlements?_t=${Date.now()}`, {
      headers: { 
        'Authorization': `Bearer ${existingSessionToken}`,
        'Cache-Control': 'no-cache'
      }
    });
    assert(refreshEntitlementsRes.data.features.marketing === false, 'Existing active session fetched updated marketing: false without new JWT');

    // ----------------------------------------------------
    // TEST F & G: Cache-Control verification & Diagnostic Endpoint
    // ----------------------------------------------------
    console.log('\n📌 TEST F & G: HTTP No-Store Cache Headers & Diagnostic Endpoint');
    assert(refreshEntitlementsRes.headers['cache-control']?.includes('no-store'), 'Response contains Cache-Control: no-store');

    const debugDiagRes = await axios.get(`${baseUrl}/api/tenant/entitlements/debug`, {
      headers: { 'Authorization': `Bearer ${existingSessionToken}` }
    });
    assert(debugDiagRes.status === 200, 'Diagnostic /api/tenant/entitlements/debug returned 200');
    assert(debugDiagRes.data.companyName === 'Acme Enterprise', 'Debug endpoint identified correct company');
    assert(debugDiagRes.data.features.marketing === false, 'Debug endpoint returned accurate authoritative features');

    // ----------------------------------------------------
    // TEST H: Company A changes -> Company B remains unchanged
    // ----------------------------------------------------
    console.log('\n📌 TEST H: Cross-Tenant Isolation: Acme changes do not affect BetaCorp');
    const betaEntitlements = await axios.get(`${baseUrl}/api/tenant/entitlements`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(betaEntitlements.data.name === 'Beta Global', 'BetaCorp data retrieved');
    assert(betaEntitlements.data.features.service === false, 'BetaCorp service remains false');
    assert(betaEntitlements.data.features.sales === true, 'BetaCorp sales remains true');

    // ----------------------------------------------------
    // TEST I & J: User Permission vs Company Feature Matrix
    // ----------------------------------------------------
    console.log('\n📌 TEST I & J: Effective Access = Company Feature Enabled AND User Permission Granted');
    // Test I: User permission = false (sales role cannot manage beats), Company feature = true
    const salesUserLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'sales@acme.com',
      password: 'SecurePass123!'
    });
    const salesUserToken = salesUserLogin.data.token;

    let rbacBlocked = false;
    try {
      // Sales user trying to import serials (requires serial_validation.import permission)
      await axios.post(`${baseUrl}/api/v1/serial-registry/import/preview`, {
        csvData: 'materialCode,serialNumber,dealerCode\nMC1,SN1,DLR1'
      }, {
        headers: { 'Authorization': `Bearer ${salesUserToken}` }
      });
    } catch (err) {
      rbacBlocked = (err.response?.status === 403);
    }
    assert(rbacBlocked === true, 'User without permission blocked by RBAC even if company feature is enabled');

    // Test J: User has admin permission, but Company feature = false
    let featureGateBlocked = false;
    try {
      // Acme Admin trying to access marketing when company marketing feature is false
      await axios.get(`${baseUrl}/api/marketing/active`, {
        headers: { 'Authorization': `Bearer ${existingSessionToken}` }
      });
    } catch (err) {
      featureGateBlocked = (err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_ENABLED');
    }
    assert(featureGateBlocked === true, 'Admin with permission blocked by featureGate when company feature is disabled');

    console.log('\n======================================================');
    console.log(`🏁 RUNTIME SYNC RESULTS (TESTS A-J): ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Runtime sync test failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runRuntimeSyncTests();
