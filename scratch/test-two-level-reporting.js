/**
 * Charlie's CRM — Two-Level Reporting & Platform Analytics Test Suite
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
const SerialRegistry = require('../models/SerialRegistry');
const StockTransfer = require('../models/StockTransfer');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const PlatformUsageEvent = require('../models/PlatformUsageEvent');
const ServiceCenter = require('../models/ServiceCenter');
const ServiceRequest = require('../models/ServiceRequest');
const Lead = require('../models/Lead');
const ApiKey = require('../models/ApiKey');

const platformAnalyticsRouter = require('../routes/platformAnalytics');
const reportsRouter = require('../routes/reports');
const { trackPlatformEvent } = require('../services/platformAnalyticsService');

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

async function runTwoLevelReportingTests() {
  console.log('🚀 Starting Charlie\'s CRM Two-Level Reporting & Platform Analytics Verification...\n');

  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    const app = express();
    app.use(express.json());
    app.use('/api/platform/analytics', platformAnalyticsRouter);
    app.use('/api/reports', reportsRouter);

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`✅ Test HTTP Server listening at ${baseUrl}\n`);
        resolve();
      });
    });

    // 1. Setup Companies & Users
    console.log('🏢 TEST GROUP 1: Provision Multi-Tenant Ecosystem');
    const compA = await new Company({
      name: 'Alpha Dynamics',
      code: 'ALPHA',
      subdomain: 'alpha',
      status: 'ACTIVE',
      isActive: true,
      billing: { plan: 'ENTERPRISE' }
    }).save();

    const compB = await new Company({
      name: 'Beta Energies',
      code: 'BETA',
      subdomain: 'beta',
      status: 'ACTIVE',
      isActive: true,
      billing: { plan: 'STARTER' }
    }).save();

    const passwordHash = await bcrypt.hash('SecurePass123!', 10);
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
      name: 'Platform Super Admin',
      email: 'super@charliescrm.com',
      password: passwordHash,
      role: 'super-admin'
    }).save();

    const tokenA = jwt.sign({ id: userA._id, role: userA.role, companyId: compA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: userB._id, role: userB.role, companyId: compB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokenSuper = jwt.sign({ id: superAdmin._id, role: superAdmin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    assert(Boolean(compA._id && compB._id), 'Provisioned Alpha and Beta companies');

    // 2. Populate Operational Data for Alpha
    console.log('\n📦 TEST GROUP 2: Populate Alpha Operational Business Data');
    await new Lead({ companyId: compA._id, name: 'Lead 1', email: 'lead1@example.com', status: 'converted' }).save();
    await new Lead({ companyId: compA._id, name: 'Lead 2', email: 'lead2@example.com', status: 'new' }).save();

    await new Order({ companyId: compA._id, userId: userA._id, orderNumber: 'ORD-001', amount: 50000, totalAmount: 50000, status: 'delivered', customerName: 'Client 1' }).save();
    await new Order({ companyId: compA._id, userId: userA._id, orderNumber: 'ORD-002', amount: 30000, totalAmount: 30000, status: 'processing', customerName: 'Client 2' }).save();

    await new SerialRegistry({ companyId: compA._id, materialCode: 'MAT-1', serialNumber: 'SN-A-01', status: 'IN_STOCK' }).save();
    await new SerialRegistry({ companyId: compA._id, materialCode: 'MAT-1', serialNumber: 'SN-A-02', status: 'IN_TRANSIT' }).save();
    await new SerialRegistry({ companyId: compA._id, materialCode: 'MAT-1', serialNumber: 'SN-A-03', status: 'VALIDATED' }).save();

    await new StockTransfer({
      companyId: compA._id,
      transferNumber: 'TRF-001',
      materialCode: 'MAT-1',
      fromHolderType: 'COMPANY',
      fromHolderId: 'WH_1',
      toHolderType: 'DISTRIBUTOR',
      toHolderId: 'DIST_1',
      quantity: 1,
      initiatedBy: userA._id,
      status: 'ACCEPTED'
    }).save();

    await new StockTransfer({
      companyId: compA._id,
      transferNumber: 'TRF-002',
      materialCode: 'MAT-1',
      fromHolderType: 'COMPANY',
      fromHolderId: 'WH_1',
      toHolderType: 'DISTRIBUTOR',
      toHolderId: 'DIST_1',
      quantity: 1,
      initiatedBy: userA._id,
      status: 'PENDING'
    }).save();

    await new SerialValidationHistory({
      companyId: compA._id,
      materialCode: 'MAT-1',
      serialNumber: 'SN-A-03',
      dealerCode: 'DLR-1',
      responseStatus: 'success',
      validationResult: 'VALID'
    }).save();

    const serviceCenter = await new ServiceCenter({
      name: 'Alpha Care Center',
      code: 'SC-ALPHA-1',
      email: 'care@alpha.com',
      phone: '9998887776',
      address: '123 Main St, Mumbai, MH, 400001',
      gstNumber: '27AAAAA0000A1Z5'
    }).save();

    await new ServiceRequest({
      companyId: compA._id,
      serviceCenterId: serviceCenter._id,
      serviceCenterName: serviceCenter.name,
      serviceCenterEmail: serviceCenter.email,
      serviceType: 'repair',
      productType: 'LED TV',
      serialNumber: 'SN-A-01',
      issueType: 'Hardware',
      description: 'Display issue',
      status: 'in-progress'
    }).save();

    await new ServiceRequest({
      companyId: compA._id,
      serviceCenterId: serviceCenter._id,
      serviceCenterName: serviceCenter.name,
      serviceCenterEmail: serviceCenter.email,
      serviceType: 'installation',
      productType: 'LED TV',
      serialNumber: 'SN-A-02',
      issueType: 'Installation',
      description: 'Wall mount setup',
      status: 'resolved'
    }).save();

    // 3. Emit Platform Usage Events
    console.log('\n⚡ TEST GROUP 3: Emit Platform Usage Events');
    await trackPlatformEvent({ companyId: compA._id, userId: userA._id, module: 'SALES', action: 'ORDER_CREATE' });
    await trackPlatformEvent({ companyId: compA._id, userId: userA._id, module: 'SALES', action: 'ORDER_CREATE' });
    await trackPlatformEvent({ companyId: compA._id, userId: userA._id, module: 'INVENTORY', action: 'UNIT_REGISTER' });
    await trackPlatformEvent({ companyId: compA._id, userId: userA._id, module: 'SERIAL_VALIDATION', action: 'VALIDATE' });
    await trackPlatformEvent({ companyId: compB._id, userId: userB._id, module: 'SERIAL_VALIDATION', action: 'VALIDATE' });

    const totalEvents = await PlatformUsageEvent.countDocuments({});
    assert(totalEvents === 5, `Recorded exactly 5 platform usage events across tenants (Count: ${totalEvents})`);

    // 4. Company Admin Operational Report (Level 1)
    console.log('\n📊 TEST GROUP 4: Level 1 — Company Admin Operational Business Reports');
    const alphaReportRes = await axios.get(
      `${baseUrl}/api/reports/operational-summary`,
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );

    assert(alphaReportRes.status === 200, 'Company Admin successfully fetched operational report');
    const r = alphaReportRes.data;

    assert(r.sales.leads === 2, 'Sales leads = 2');
    assert(r.sales.convertedLeads === 1, 'Converted leads = 1');
    assert(r.sales.orders === 2, 'Orders count = 2');
    assert(r.sales.revenue === 80000, 'Total revenue = 80,000');
    assert(r.sales.averageOrderValue === 40000, 'Average order value (AOV) = 40,000');

    assert(r.inventory.totalUnits === 3, 'Inventory total units = 3');
    assert(r.inventory.availableUnits === 1, 'Available in stock = 1');
    assert(r.inventory.inTransitUnits === 1, 'In-transit = 1');
    assert(r.inventory.soldUnits === 1, 'Sold / Validated = 1');

    assert(r.distribution.totalTransfers === 2, 'Total transfers = 2');
    assert(r.distribution.pendingTransfers === 1, 'Pending transfers = 1');

    assert(r.service.openCases === 1, 'Open service cases = 1');
    assert(r.service.resolvedCases === 1, 'Resolved service cases = 1');

    // 5. Super Admin Platform Analytics (Level 2)
    console.log('\n⚡ TEST GROUP 5: Level 2 — Super Admin SaaS Command Center & Platform KPIs');
    const kpiRes = await axios.get(
      `${baseUrl}/api/platform/analytics/kpis`,
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(kpiRes.status === 200, 'Super Admin fetched top-level platform KPIs');
    assert(kpiRes.data.totalCompanies === 2, 'Platform total companies = 2');
    assert(kpiRes.data.activeCompanies === 2, 'Platform active companies = 2');
    assert(kpiRes.data.totalUnits === 3, 'Platform total product units = 3');
    assert(kpiRes.data.totalTransactions === 4, 'Platform total transactions = 4');

    // Feature Utilization Breakdown
    const featRes = await axios.get(
      `${baseUrl}/api/platform/analytics/features`,
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(featRes.status === 200, 'Super Admin fetched feature utilization breakdown');
    const salesFeature = featRes.data.breakdown.find(f => f.feature === 'SALES');
    assert(salesFeature !== undefined && salesFeature.totalUsage === 2, 'Sales module usage = 2');
    assert(salesFeature.activeCompanies === 1, 'Sales active companies = 1');

    // Company Comparison Matrix & CRM Adoption Score
    const compMatrixRes = await axios.get(
      `${baseUrl}/api/platform/analytics/companies`,
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(compMatrixRes.status === 200, 'Super Admin fetched company comparison matrix');
    const alphaMatrix = compMatrixRes.data.find(c => c.companyCode === 'ALPHA');
    assert(alphaMatrix.users === 1, 'Alpha matrix users = 1');
    assert(alphaMatrix.orders === 2, 'Alpha matrix orders = 2');
    assert(alphaMatrix.units === 3, 'Alpha matrix units = 3');
    assert(alphaMatrix.adoptionScore >= 70, `Alpha adoption score = ${alphaMatrix.adoptionScore} (Tier: ${alphaMatrix.adoptionTier})`);

    // Single Company Drill-Down
    const drilldownRes = await axios.get(
      `${baseUrl}/api/platform/analytics/companies/${compA._id}`,
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(drilldownRes.status === 200, 'Super Admin fetched single company drill-down summary');
    assert(drilldownRes.data.company.name === 'Alpha Dynamics', 'Drilldown company name matches');
    assert(drilldownRes.data.metrics.totalUnits === 3, 'Drilldown totalUnits matches');

    // Platform Health
    const healthRes = await axios.get(
      `${baseUrl}/api/platform/analytics/health`,
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(healthRes.status === 200, 'Super Admin fetched platform health');
    assert(healthRes.data.status === 'OPERATIONAL', 'Platform health status === OPERATIONAL');
    assert(healthRes.data.databaseStatus === 'HEALTHY', 'Database status === HEALTHY');

    // 6. Security Boundaries & Cross-Tenant Access Enforcement
    console.log('\n🔒 TEST GROUP 6: Role Permissions & Cross-Tenant Boundary Enforcement');
    let companyAdminBlockedFromPlatform = false;
    try {
      await axios.get(
        `${baseUrl}/api/platform/analytics/kpis`,
        { headers: { 'Authorization': `Bearer ${tokenA}` } }
      );
    } catch (err) {
      companyAdminBlockedFromPlatform = (err.response.status === 403);
    }
    assert(companyAdminBlockedFromPlatform === true, 'Company Admin is BLOCKED from accessing Super Admin platform analytics (HTTP 403)');

    let betaAdminBlockedFromAlpha = false;
    try {
      const betaReportRes = await axios.get(
        `${baseUrl}/api/reports/operational-summary`,
        { headers: { 'Authorization': `Bearer ${tokenB}` } }
      );
      // Beta should only see Beta's empty metrics, NOT Alpha's data
      assert(betaReportRes.data.sales.orders === 0, 'Beta Admin cannot see Alpha orders (Orders = 0)');
      assert(betaReportRes.data.inventory.totalUnits === 0, 'Beta Admin cannot see Alpha units (Units = 0)');
      betaAdminBlockedFromAlpha = true;
    } catch (err) {
      betaAdminBlockedFromAlpha = false;
    }
    assert(betaAdminBlockedFromAlpha === true, 'Strict tenant isolation between Company Alpha and Company Beta operational reports');

    console.log('\n======================================================');
    console.log(`🏁 TWO-LEVEL REPORTING RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Two-level reporting test failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runTwoLevelReportingTests();
