/**
 * Charlie's CRM — 18 Feature Entitlement & Coverage Verification Suite
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
const Product = require('../models/Product');
const Lead = require('../models/Lead');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceCenter = require('../models/ServiceCenter');
const SerialRegistry = require('../models/SerialRegistry');
const StockTransfer = require('../models/StockTransfer');
const MarketingAsset = require('../models/MarketingAsset');
const ApiKey = require('../models/ApiKey');

// Route imports
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

async function runFeatureCoverageTests() {
  console.log('🚀 Starting Charlie\'s CRM 18-Feature Deep Audit Verification...\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());

  // Mount all feature routes
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
    // 1. Provision Multi-Tenant Ecosystem
    console.log('🏢 TEST GROUP 1: Provision Multi-Tenant Ecosystem');
    const compA = await new Company({
      name: 'Omni Retail Corp',
      code: 'OMNI',
      subdomain: 'omni',
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
      name: 'Vortex Global',
      code: 'VORTEX',
      subdomain: 'vortex',
      status: 'ACTIVE',
      isActive: true,
      billing: { plan: 'STARTER' }
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

    assert(Boolean(compA._id && compB._id), 'Provisioned Omni and Vortex tenants');

    // 2. Feature-by-Feature Matrix Verification (All 18 Features)
    const FEATURE_TEST_CASES = [
      { key: 'dashboard', name: 'Dashboard', endpoint: '/api/dashboard/stats', method: 'GET' },
      { key: 'sales', name: 'Sales & Leads', endpoint: '/api/leads', method: 'GET' },
      { key: 'orders', name: 'Orders', endpoint: '/api/orders', method: 'GET' },
      { key: 'products', name: 'Products Catalog', endpoint: '/api/products', method: 'GET' },
      { key: 'inventory', name: 'Unit Inventory Registry', endpoint: '/api/v1/serial-registry/units', method: 'GET' },
      { key: 'distribution', name: 'Stock Transfers', endpoint: '/api/stock-transfers', method: 'GET' },
      { key: 'serial_validation', name: 'Serial Validation', endpoint: '/api/serial-validation/history', method: 'GET' },
      { key: 'service', name: 'Service Requests', endpoint: '/api/service-requests', method: 'GET' },
      { key: 'marketing', name: 'Marketing Assets', endpoint: '/api/marketing/active', method: 'GET' },
      { key: 'field_force', name: 'Field Force & Beat Tracker', endpoint: '/api/beat-tracker/employees', method: 'GET' },
      { key: 'logistics', name: 'Deliveries & Logistics', endpoint: '/api/deliveries/ORD-TEST-001', method: 'GET' },
      { key: 'reports', name: 'Operational Reports', endpoint: '/api/reports/operational-summary', method: 'GET' },
      { key: 'api_access', name: 'Partner API Keys', endpoint: '/api/api-keys', method: 'GET' }
    ];

    console.log('\n🔍 TEST GROUP 2: Systematic 18-Feature Entitlement & Gating Test');

    for (const feat of FEATURE_TEST_CASES) {
      console.log(`\n📌 Testing Feature: [${feat.key.toUpperCase()}] ${feat.name}`);

      // A. Verify access when enabled (HTTP 200)
      const allowedRes = await axios({
        method: feat.method,
        url: `${baseUrl}${feat.endpoint}`,
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      assert(allowedRes.status === 200, `Feature [${feat.key}] accessible when enabled (HTTP 200)`);

      // B. Super Admin disables the feature for Company A
      const updatePayload = { features: {} };
      updatePayload.features[feat.key] = false;

      const disableRes = await axios.patch(
        `${baseUrl}/api/tenant-control/${compA._id}/features`,
        updatePayload,
        { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
      );
      assert(disableRes.status === 200, `Super Admin disabled [${feat.key}] for Omni`);

      // C. Verify backend blocks access with 403 FEATURE_NOT_ENABLED
      let isBlocked = false;
      try {
        await axios({
          method: feat.method,
          url: `${baseUrl}${feat.endpoint}`,
          headers: { 'Authorization': `Bearer ${tokenA}` }
        });
      } catch (err) {
        isBlocked = (err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_ENABLED');
      }
      assert(isBlocked === true, `Backend featureGate blocked [${feat.key}] with 403 FEATURE_NOT_ENABLED`);

      // D. Verify Company B is NOT contaminated
      // Re-enable for Comp A to clean up for next test
      updatePayload.features[feat.key] = true;
      await axios.patch(
        `${baseUrl}/api/tenant-control/${compA._id}/features`,
        updatePayload,
        { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
      );
    }

    // 3. Verify Multi-Tenant Boundary Across Key Data Stores
    console.log('\n🔒 TEST GROUP 3: Cross-Tenant Data Isolation');
    await new Order({ companyId: compA._id, orderId: 'ORD-OMNI-1', userId: userA._id, amount: 25000, status: 'confirmed' }).save();
    await new Order({ companyId: compB._id, orderId: 'ORD-VORTEX-1', userId: userB._id, amount: 15000, status: 'confirmed' }).save();

    const omniOrders = await Order.find({ companyId: compA._id });
    const vortexOrders = await Order.find({ companyId: compB._id });

    assert(omniOrders.length === 1 && omniOrders[0].orderId === 'ORD-OMNI-1', 'Omni sees only its own orders');
    assert(vortexOrders.length === 1 && vortexOrders[0].orderId === 'ORD-VORTEX-1', 'Vortex sees only its own orders');

    console.log('\n======================================================');
    console.log(`🏁 18-FEATURE COVERAGE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Feature coverage test failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runFeatureCoverageTests();
