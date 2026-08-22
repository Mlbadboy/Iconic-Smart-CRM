/**
 * Charlie's CRM — Super Admin Tenant Control, Feature Entitlements,
 * Subscription, Notifications & Access Suspension Test Suite
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
const ServiceCenter = require('../models/ServiceCenter');
const ServiceRequest = require('../models/ServiceRequest');
const PlatformNotification = require('../models/PlatformNotification');
const AuditEvent = require('../models/AuditEvent');

const tenantControlRouter = require('../routes/tenantControl');
const notificationsRouter = require('../routes/platformNotifications');
const tenantRouter = require('../routes/tenant');
const serviceRequestsRouter = require('../routes/serviceRequests');
const externalValidationRouter = require('../routes/externalSerialValidation');

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

async function runTenantControlTests() {
  console.log('🚀 Starting Charlie\'s CRM Tenant Control & Feature Entitlements Verification...\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());
  app.use('/api/tenant-control', tenantControlRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/tenant', tenantRouter);
  app.use('/api/service-requests', serviceRequestsRouter);
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
    // 1. Provision Test Tenants & Users
    console.log('🏢 TEST GROUP 1: Provision Multi-Tenant Companies & Users');
    const compA = await new Company({
      name: 'Apex Industries',
      code: 'APEX',
      subdomain: 'apex',
      status: 'ACTIVE',
      isActive: true,
      billing: { plan: 'STARTER', subscriptionEnd: new Date(Date.now() + 30 * 86400000) },
      features: {
        dashboard: true,
        sales: true,
        orders: true,
        service: true,
        serial_validation: true,
        marketing: false
      }
    }).save();

    const compB = await new Company({
      name: 'Zenith Solar',
      code: 'ZENITH',
      subdomain: 'zenith',
      status: 'ACTIVE',
      isActive: true,
      billing: { plan: 'ENTERPRISE', subscriptionEnd: new Date(Date.now() + 60 * 86400000) },
      features: {
        dashboard: true,
        sales: true,
        orders: true,
        service: true,
        serial_validation: true,
        marketing: true
      }
    }).save();

    const passwordHash = await bcrypt.hash('SecurePass123!', 10);
    const userA = await new User({
      name: 'Apex Admin',
      email: 'admin@apex.com',
      password: passwordHash,
      role: 'company-admin',
      companyId: compA._id
    }).save();

    const userB = await new User({
      name: 'Zenith Admin',
      email: 'admin@zenith.com',
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

    assert(Boolean(compA._id && compB._id), 'Provisioned Apex and Zenith tenants');

    // 2. Feature Enabled vs Disabled Access (Backend Gating)
    console.log('\n⚙️ TEST GROUP 2: Feature Entitlement Enforcement (Backend Gating)');
    const sc = await new ServiceCenter({
      name: 'Apex Care',
      code: 'SC-APEX-1',
      email: 'care@apex.com',
      phone: '9998887770',
      address: '100 Tech Park, Mumbai',
      gstNumber: '27AAAAA0000A1Z5'
    }).save();

    // With service: true, userA can list service requests
    const initialServiceRes = await axios.get(
      `${baseUrl}/api/service-requests`,
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );
    assert(initialServiceRes.status === 200, 'Service module accessible when feature entitlement = true (HTTP 200)');

    // Super Admin disables 'service' feature for Apex
    const disableFeatRes = await axios.patch(
      `${baseUrl}/api/tenant-control/${compA._id}/features`,
      { features: { service: false } },
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(disableFeatRes.status === 200, 'Super Admin disabled service feature for Apex');
    assert(disableFeatRes.data.features.service === false, 'Service feature confirmed as false');

    // User A attempts to access service requests -> Expected 403 FEATURE_NOT_ENABLED
    let apexServiceBlocked = false;
    try {
      await axios.get(
        `${baseUrl}/api/service-requests`,
        { headers: { 'Authorization': `Bearer ${tokenA}` } }
      );
    } catch (err) {
      apexServiceBlocked = (err.response.status === 403 && err.response.data.code === 'FEATURE_NOT_ENABLED');
    }
    assert(apexServiceBlocked === true, 'Backend blocked Apex service request with 403 FEATURE_NOT_ENABLED');

    // Verify Company B is NOT affected
    const zenithServiceRes = await axios.get(
      `${baseUrl}/api/service-requests`,
      { headers: { 'Authorization': `Bearer ${tokenB}` } }
    );
    assert(zenithServiceRes.status === 200, 'Company B retains service module access (Zero cross-tenant entitlement contamination)');

    // 3. Company Admin Security Restriction
    console.log('\n🔒 TEST GROUP 3: Company Admin Security Boundaries');
    let companyAdminBlocked = false;
    try {
      await axios.patch(
        `${baseUrl}/api/tenant-control/${compA._id}/features`,
        { features: { service: true } },
        { headers: { 'Authorization': `Bearer ${tokenA}` } }
      );
    } catch (err) {
      companyAdminBlocked = (err.response.status === 403);
    }
    assert(companyAdminBlocked === true, 'Company Admin is BLOCKED from modifying feature entitlements (HTTP 403)');

    // 4. Tenant Entitlements Query
    console.log('\n📋 TEST GROUP 4: Tenant Query for Enabled Features & Quotas');
    const entRes = await axios.get(
      `${baseUrl}/api/tenant/entitlements`,
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );
    assert(entRes.status === 200, 'Company Admin retrieved tenant entitlements');
    assert(entRes.data.features.service === false, 'Entitlements confirm service = false');
    assert(entRes.data.features.sales === true, 'Entitlements confirm sales = true');
    assert(entRes.data.storage.storageLimitBytes > 0, 'Storage limit metadata present');

    // 5. Subscription Plan & Storage Limit Updates
    console.log('\n💳 TEST GROUP 5: Super Admin Subscription & Storage Quota Control');
    const subUpdateRes = await axios.patch(
      `${baseUrl}/api/tenant-control/${compA._id}/subscription`,
      {
        plan: 'PROFESSIONAL',
        billingCycle: 'ANNUAL',
        storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10 GB
        paymentStatus: 'PAID',
        applyPlanDefaultFeatures: true
      },
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(subUpdateRes.status === 200, 'Super Admin upgraded Apex to PROFESSIONAL with 10GB storage');
    assert(subUpdateRes.data.billing.plan === 'PROFESSIONAL', 'Plan updated to PROFESSIONAL');
    assert(subUpdateRes.data.features.service === true, 'Pro default features restored service access to true');

    // 6. Tenant Suspension Lifecycle & Zero Data Loss
    console.log('\n⏸️ TEST GROUP 6: Tenant Suspension & Non-Destructive Protection');
    // Create product unit before suspension
    await new SerialRegistry({
      companyId: compA._id,
      materialCode: 'APEX-MOD-1',
      serialNumber: 'SN-APEX-99001',
      status: 'IN_STOCK'
    }).save();

    // Super Admin suspends Apex
    const suspendRes = await axios.post(
      `${baseUrl}/api/tenant-control/${compA._id}/suspend`,
      { reason: 'Annual renewal invoice past due by 15 days' },
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(suspendRes.status === 200, 'Super Admin suspended Apex tenant');
    assert(suspendRes.data.status === 'SUSPENDED', 'Apex status is now SUSPENDED');

    // Regular CRM calls are now blocked with 403 TENANT_SUSPENDED
    let suspendedBlocked = false;
    try {
      await axios.get(
        `${baseUrl}/api/service-requests`,
        { headers: { 'Authorization': `Bearer ${tokenA}` } }
      );
    } catch (err) {
      suspendedBlocked = (err.response.status === 403 && err.response.data.code === 'TENANT_SUSPENDED');
    }
    assert(suspendedBlocked === true, 'Suspended tenant blocked from CRM operations (HTTP 403 TENANT_SUSPENDED)');

    // Verify ZERO DATA LOSS
    const preReactivateUnit = await SerialRegistry.findOne({ serialNumber: 'SN-APEX-99001' });
    assert(preReactivateUnit !== null, 'All product units and serial records remain 100% INTACT in database');

    // 7. Reactivation Restores Normal Access Immediately
    console.log('\n▶️ TEST GROUP 7: Tenant Reactivation');
    const reactivateRes = await axios.post(
      `${baseUrl}/api/tenant-control/${compA._id}/reactivate`,
      {},
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(reactivateRes.status === 200, 'Super Admin reactivated Apex tenant');
    assert(reactivateRes.data.status === 'ACTIVE', 'Apex status restored to ACTIVE');

    // User A can access CRM again
    const postReactivateRes = await axios.get(
      `${baseUrl}/api/service-requests`,
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );
    assert(postReactivateRes.status === 200, 'Apex Admin restored to normal CRM operations immediately');

    // 8. Platform Notifications & Maintenance Announcements
    console.log('\n📢 TEST GROUP 8: Platform Announcements & Targeting');
    // Broadcast notification
    const broadcastNotif = await axios.post(
      `${baseUrl}/api/notifications/platform`,
      {
        title: 'Scheduled System Maintenance',
        message: 'Database optimization tonight from 11:00 PM to 12:00 AM IST.',
        type: 'SYSTEM_MAINTENANCE',
        priority: 'HIGH',
        audience: 'ALL_COMPANIES'
      },
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(broadcastNotif.status === 201, 'Super Admin published broadcast maintenance notification');

    // Targeted notification for ENTERPRISE plan only
    const enterpriseNotif = await axios.post(
      `${baseUrl}/api/notifications/platform`,
      {
        title: 'Enterprise Dedicated SLA Report Available',
        message: 'Your monthly SLA uptime report is ready in the analytics portal.',
        type: 'NEW_FEATURE',
        priority: 'MEDIUM',
        audience: 'SELECTED_PLAN',
        targetPlans: ['ENTERPRISE']
      },
      { headers: { 'Authorization': `Bearer ${tokenSuper}` } }
    );
    assert(enterpriseNotif.status === 201, 'Super Admin published targeted Enterprise announcement');

    // Tenant A (PROFESSIONAL plan) checks notifications
    const notifResA = await axios.get(
      `${baseUrl}/api/notifications/tenant`,
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );
    assert(notifResA.status === 200, 'Apex retrieved tenant notifications');
    assert(notifResA.data.activeMaintenance !== null, 'Apex received active maintenance banner');
    assert(notifResA.data.notifications.some(n => n.title === 'Scheduled System Maintenance'), 'Apex received broadcast announcement');
    assert(!notifResA.data.notifications.some(n => n.title === 'Enterprise Dedicated SLA Report Available'), 'Apex did NOT receive Enterprise-only announcement');

    // Tenant B (ENTERPRISE plan) checks notifications
    const notifResB = await axios.get(
      `${baseUrl}/api/notifications/tenant`,
      { headers: { 'Authorization': `Bearer ${tokenB}` } }
    );
    assert(notifResB.data.notifications.some(n => n.title === 'Enterprise Dedicated SLA Report Available'), 'Zenith (Enterprise) received Enterprise targeted announcement');

    // Mark as read
    const notifId = notifResA.data.notifications[0].id;
    const readRes = await axios.post(
      `${baseUrl}/api/notifications/tenant/${notifId}/read`,
      {},
      { headers: { 'Authorization': `Bearer ${tokenA}` } }
    );
    assert(readRes.status === 200, 'Apex marked notification as read');

    // 9. Audit Event Verification
    console.log('\n📝 TEST GROUP 9: Platform Audit Event Logging');
    const auditLogs = await AuditEvent.find({ action: { $in: ['company.features_update', 'company.subscription_update', 'company.suspend', 'company.reactivate', 'notification.publish'] } });
    assert(auditLogs.length >= 4, `Recorded ${auditLogs.length} audit trail records for Super Admin control actions`);

    console.log('\n======================================================');
    console.log(`🏁 TENANT CONTROL & ENTITLEMENTS RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Tenant control test suite failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runTenantControlTests();
