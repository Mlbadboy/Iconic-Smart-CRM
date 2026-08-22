/**
 * Charlie's CRM — Real User Workflow & Entitlement Lifecycle Acceptance Test Suite
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
const Role = require('../models/Role');
const Department = require('../models/Department');
const Lead = require('../models/Lead');
const ServiceRequest = require('../models/ServiceRequest');

// Route imports
const authRouter = require('../routes/auth');
const usersRouter = require('../routes/users');
const rolesRouter = require('../routes/roles');
const departmentsRouter = require('../routes/departments');
const leadsRouter = require('../routes/leads');
const serviceRequestsRouter = require('../routes/serviceRequests');
const tenantRouter = require('../routes/tenant');
const tenantControlRouter = require('../routes/tenantControl');

process.env.JWT_SECRET = 'supersecretjwtkeythatislongerthan32charactersforsecurity';

let mongod;
let server;
let baseUrl;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createToken(user, fallbackCompanyId = null) {
  const userId = user._id ? user._id.toString() : (user.id ? user.id.toString() : '');
  const companyId = user.companyId ? user.companyId.toString() : (fallbackCompanyId ? fallbackCompanyId.toString() : null);
  const customRoleId = user.customRoleId ? user.customRoleId.toString() : null;
  return jwt.sign(
    {
      id: userId,
      role: user.role,
      companyId,
      customRoleId,
      scopeType: user.scopeType || 'ALL',
      scopeValues: user.scopeValues || []
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function setupEnvironment() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());

  app.use('/api/tenant', tenantRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/departments', departmentsRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/service-requests', serviceRequestsRouter);
  app.use('/api/tenant-control', tenantControlRouter);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
}

async function runAcceptanceSequence() {
  console.log('======================================================================');
  console.log('🎯 RUNNING COMPLETE USER, ROLE, DEPARTMENT & LIFECYCLE ACCEPTANCE TEST');
  console.log('======================================================================\n');

  try {
    await setupEnvironment();

    // 1. Create Company with initial features: sales=true, service=true, logistics=true
    const company = await Company.create({
      name: 'Nexus Technologies',
      code: 'NEXUS',
      email: 'admin@nexustech.com',
      subdomain: 'nexustech',
      features: {
        dashboard: true,
        sales: true,
        service: true,
        logistics: true,
        customers: true,
        orders: true,
        inventory: true
      },
      status: 'ACTIVE',
      isActive: true
    });

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Create Super Admin
    const superAdmin = await User.create({
      name: 'Platform Super Admin',
      email: 'superadmin@platform.com',
      password: hashedPassword,
      role: 'super-admin',
      status: 'ACTIVE',
      isActive: true
    });
    const superAdminToken = createToken(superAdmin);

    // Create Company Admin
    const companyAdmin = await User.create({
      name: 'Nexus Admin',
      email: 'admin@nexustech.com',
      password: hashedPassword,
      role: 'company-admin',
      companyId: company._id,
      status: 'ACTIVE',
      isActive: true
    });
    const companyAdminToken = createToken(companyAdmin);

    console.log('--- STEP 1: Company Admin Creates Organization Departments ---');
    const deptSales = await axios.post(`${baseUrl}/api/departments`, {
      name: 'Sales',
      description: 'Regional sales & business development'
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(deptSales.status === 201, 'Created Department: Sales');

    const deptService = await axios.post(`${baseUrl}/api/departments`, {
      name: 'Service',
      description: 'Customer service & technical support'
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(deptService.status === 201, 'Created Department: Service');

    const deptLogistics = await axios.post(`${baseUrl}/api/departments`, {
      name: 'Logistics',
      description: 'Order fulfillment & supply chain'
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(deptLogistics.status === 201, 'Created Department: Logistics');

    console.log('\n--- STEP 2: Company Admin Configures Departmental Roles ---');
    // Sales Manager Role
    const roleSalesMgr = await axios.post(`${baseUrl}/api/roles`, {
      name: 'Sales Manager',
      department: 'Sales',
      permissions: ['lead.view', 'lead.create', 'lead.edit', 'lead.assign', 'order.view', 'order.create'],
      scopeType: 'REGION',
      scopeValues: ['West']
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(roleSalesMgr.status === 201, 'Created Role: Sales Manager (REGION: West)');

    // Sales Executive Role
    const roleSalesExec = await axios.post(`${baseUrl}/api/roles`, {
      name: 'Sales Executive',
      department: 'Sales',
      permissions: ['lead.view', 'lead.create', 'lead.edit'],
      scopeType: 'SELF',
      scopeValues: []
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(roleSalesExec.status === 201, 'Created Role: Sales Executive (SELF)');

    // Service Manager Role
    const roleServiceMgr = await axios.post(`${baseUrl}/api/roles`, {
      name: 'Service Manager',
      department: 'Service',
      permissions: ['service.view', 'service.create', 'service.edit', 'service.assign', 'service.resolve', 'service.close'],
      scopeType: 'ALL',
      scopeValues: []
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(roleServiceMgr.status === 201, 'Created Role: Service Manager (ALL)');

    // Logistics Executive Role
    const roleLogisticsExec = await axios.post(`${baseUrl}/api/roles`, {
      name: 'Logistics Executive',
      department: 'Logistics',
      permissions: ['delivery.view', 'dispatch.create', 'order.view'],
      scopeType: 'ALL',
      scopeValues: []
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(roleLogisticsExec.status === 201, 'Created Role: Logistics Executive (ALL)');

    console.log('\n--- STEP 3: Company Admin Provisions Team Members ---');
    // Rahul -> Sales Manager -> REGION: West
    const rahulUserRes = await axios.post(`${baseUrl}/api/users`, {
      name: 'Rahul Sharma',
      email: 'rahul@nexustech.com',
      password: 'Password123!',
      departmentId: deptSales.data.department._id,
      customRoleId: roleSalesMgr.data.role._id,
      scopeType: 'REGION',
      scopeValues: ['West'],
      status: 'ACTIVE'
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(rahulUserRes.status === 201, 'Created User: Rahul Sharma (Sales Manager, West)');
    const rahulToken = createToken({ ...rahulUserRes.data.user, customRoleId: roleSalesMgr.data.role._id }, company._id);

    // Priya -> Sales Executive -> Reporting to Rahul -> SELF
    const priyaUserRes = await axios.post(`${baseUrl}/api/users`, {
      name: 'Priya Patel',
      email: 'priya@nexustech.com',
      password: 'Password123!',
      departmentId: deptSales.data.department._id,
      customRoleId: roleSalesExec.data.role._id,
      reportingManagerId: rahulUserRes.data.user.id,
      scopeType: 'SELF',
      scopeValues: [],
      status: 'ACTIVE'
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(priyaUserRes.status === 201, 'Created User: Priya Patel (Sales Executive, SELF)');
    const priyaToken = createToken({ ...priyaUserRes.data.user, customRoleId: roleSalesExec.data.role._id }, company._id);

    // Amit -> Service Manager -> ALL
    const amitUserRes = await axios.post(`${baseUrl}/api/users`, {
      name: 'Amit Shah',
      email: 'amit@nexustech.com',
      password: 'Password123!',
      departmentId: deptService.data.department._id,
      customRoleId: roleServiceMgr.data.role._id,
      scopeType: 'ALL',
      scopeValues: [],
      status: 'ACTIVE'
    }, { headers: { Authorization: `Bearer ${companyAdminToken}` } });
    assert(amitUserRes.status === 201, 'Created User: Amit Shah (Service Manager, ALL)');
    const amitToken = createToken({ ...amitUserRes.data.user, customRoleId: roleServiceMgr.data.role._id }, company._id);

    console.log('\n--- STEP 4: Verify Cross-Department Permission Isolation ---');
    // 1. Rahul (Sales) attempts to create/manage Service Request -> MUST BE 403 Forbidden
    try {
      await axios.post(`${baseUrl}/api/service-requests`, {
        customerName: 'Acme Corp',
        subject: 'Router malfunction',
        priority: 'HIGH'
      }, { headers: { Authorization: `Bearer ${rahulToken}` } });
      assert(false, 'Rahul should not have permission to create service requests');
    } catch (err) {
      assert(err.response.status === 403, 'Rahul (Sales) blocked from Service operations (HTTP 403 Permission required: service.create)');
    }

    // 2. Amit (Service) attempts to create a Sales Lead -> MUST BE 403 Forbidden
    try {
      await axios.post(`${baseUrl}/api/leads`, {
        name: 'New Prospect',
        email: 'prospect@acme.com',
        region: 'West'
      }, { headers: { Authorization: `Bearer ${amitToken}` } });
      assert(false, 'Amit should not have permission to create sales leads');
    } catch (err) {
      assert(err.response.status === 403, 'Amit (Service) blocked from Sales Lead operations (HTTP 403 Permission required: lead.create)');
    }

    // 3. Amit (Service) creates Service Request -> MUST BE 201 Created
    const amitServiceCase = await axios.post(`${baseUrl}/api/service-requests`, {
      productType: 'LED TV',
      serviceType: 'repair',
      issueType: 'hardware',
      description: 'Display panel issue',
      serialNumber: 'TV-123456',
      serviceCenterId: new mongoose.Types.ObjectId().toString(),
      serviceCenterName: 'Central Service Hub',
      serviceCenterEmail: 'hub@nexustech.com',
      priority: 'high'
    }, { headers: { Authorization: `Bearer ${amitToken}` } });
    assert(amitServiceCase.status === 201, 'Amit (Service Manager) creates Service Request successfully (HTTP 201)');

    // 4. Rahul (Sales) creates Sales Lead -> MUST BE 201 Created
    const rahulLead = await axios.post(`${baseUrl}/api/leads`, {
      name: 'Nexus West Prospect',
      email: 'west@client.com',
      region: 'West'
    }, { headers: { Authorization: `Bearer ${rahulToken}` } });
    assert(rahulLead.status === 201, 'Rahul (Sales Manager) creates Sales Lead successfully (HTTP 201)');

    console.log('\n--- STEP 5: Super Admin Disables "Service" for Company ---');
    const updateEntitlementRes = await axios.patch(
      `${baseUrl}/api/tenant-control/${company._id}/features`,
      {
        features: {
          dashboard: true,
          sales: true,
          service: false, // 🔒 DISABLED AT PLATFORM LEVEL
          logistics: true,
          customers: true,
          orders: true,
          inventory: true
        }
      },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    assert(updateEntitlementRes.status === 200, 'Super Admin disabled Service feature for Nexus Technologies');

    // Verify Amit's service request API is now blocked with 403 FEATURE_NOT_ENABLED
    try {
      await axios.get(`${baseUrl}/api/service-requests`, {
        headers: { Authorization: `Bearer ${amitToken}` }
      });
      assert(false, 'Service API should be blocked when feature is disabled');
    } catch (err) {
      assert(err.response.status === 403, 'Service API blocked with HTTP 403');
      assert(err.response.data.code === 'FEATURE_NOT_ENABLED', 'Returns code FEATURE_NOT_ENABLED');
    }

    // Verify existing Service role is still preserved in DB
    const preservedRole = await Role.findById(roleServiceMgr.data.role._id);
    assert(preservedRole && preservedRole.name === 'Service Manager', 'Existing Service Role preserved in database');

    console.log('\n--- STEP 6: Super Admin Re-Enables "Service" for Company ---');
    await axios.patch(
      `${baseUrl}/api/tenant-control/${company._id}/features`,
      {
        features: {
          dashboard: true,
          sales: true,
          service: true, // ✅ RE-ENABLED
          logistics: true,
          customers: true,
          orders: true,
          inventory: true
        }
      },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    // Verify Amit can immediately access Service requests again with existing role permissions
    const serviceListAfterReenable = await axios.get(`${baseUrl}/api/service-requests`, {
      headers: { Authorization: `Bearer ${amitToken}` }
    });
    assert(serviceListAfterReenable.status === 200, 'Amit restored access to Service requests immediately upon feature re-enablement');
    assert(serviceListAfterReenable.data.length >= 1, 'Amit retrieved existing service cases seamlessly');

    console.log('\n======================================================================');
    console.log(`🏁 REAL ACCEPTANCE SEQUENCE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');
  } catch (err) {
    console.error('Acceptance test failure:', err);
    failed++;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }

  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runAcceptanceSequence().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runAcceptanceSequence };
