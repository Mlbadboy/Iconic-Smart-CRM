/**
 * Charlie's CRM — Company Admin RBAC, Organization & Lockout Verification Suite (Scenarios 1-15)
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
const { applyDataScope } = require('../middleware/rbac');
const {
  validatePermissionsAgainstEntitlements,
  canUserDelegatePermissions,
  getRoleTemplatesForCompany
} = require('../services/permissionRegistry');

// Route imports
const authRouter = require('../routes/auth');
const usersRouter = require('../routes/users');
const rolesRouter = require('../routes/roles');
const departmentsRouter = require('../routes/departments');
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

function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      companyId: user.companyId ? user.companyId.toString() : null,
      customRoleId: user.customRoleId ? user.customRoleId.toString() : null,
      scopeType: user.scopeType || 'ALL',
      scopeValues: user.scopeValues || []
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function setupTestEnvironment() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());

  // Mount API routes
  app.use('/api/tenant', tenantRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/departments', departmentsRouter);
  app.use('/api/tenant-control', tenantControlRouter);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
}

async function runRbacTests() {
  console.log('===============================================================');
  console.log('🚀 RUNNING COMPANY ADMIN RBAC, ORG & PERMISSION TEST SUITE');
  console.log('===============================================================\n');

  try {
    await setupTestEnvironment();

    // 1. Setup Company A (Sales, Orders, Inventory enabled; Service, Warranty, Finance DISABLED by Super Admin)
    const companyA = await Company.create({
      name: 'Alpha Dynamics Corp',
      code: 'ALPHA',
      email: 'admin@alphadynamics.com',
      subdomain: 'alphadynamics',
      features: {
        dashboard: true,
        sales: true,
        orders: true,
        customers: true,
        inventory: true,
        service: false, // EXPLICITLY DISABLED
        warranty: false,
        finance: false
      },
      status: 'ACTIVE',
      isActive: true
    });

    // 2. Setup Company B (Independent Tenant)
    const companyB = await Company.create({
      name: 'Beta Systems Inc',
      code: 'BETA',
      email: 'admin@betasystems.com',
      subdomain: 'betasystems',
      features: {
        dashboard: true,
        sales: true,
        service: true
      },
      status: 'ACTIVE',
      isActive: true
    });

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Setup Company Admin A
    const adminA = await User.create({
      name: 'Company A Admin',
      email: 'admin@alphadynamics.com',
      password: hashedPassword,
      role: 'company-admin',
      companyId: companyA._id,
      status: 'ACTIVE',
      isActive: true
    });
    const tokenA = createToken(adminA);

    // Setup Company Admin B
    const adminB = await User.create({
      name: 'Company B Admin',
      email: 'admin@betasystems.com',
      password: hashedPassword,
      role: 'company-admin',
      companyId: companyB._id,
      status: 'ACTIVE',
      isActive: true
    });
    const tokenB = createToken(adminB);

    console.log('--- SCENARIO 1: Tenant-Scoped User Creation ---');
    const userRes1 = await axios.post(
      `${baseUrl}/api/users`,
      {
        name: 'Rahul Sharma',
        email: 'rahul.sharma@alphadynamics.com',
        password: 'Password123!',
        phone: '9876543210',
        role: 'sales-executive',
        scopeType: 'SELF',
        status: 'ACTIVE'
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(userRes1.status === 201, 'Creates user under Tenant A successfully (HTTP 201)');
    const createdUserA = await User.findOne({ email: 'rahul.sharma@alphadynamics.com' });
    assert(createdUserA && String(createdUserA.companyId) === String(companyA._id), 'Created user is strictly associated with Tenant A');

    console.log('\n--- SCENARIO 2: Strict Cross-Tenant Isolation ---');
    const listResB = await axios.get(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(listResB.status === 200, 'Admin B fetches own tenant user list');
    const userALeaked = listResB.data.some((u) => u.email === 'rahul.sharma@alphadynamics.com');
    assert(!userALeaked, 'Admin B cannot view users belonging to Tenant A');

    try {
      await axios.put(
        `${baseUrl}/api/users/${createdUserA._id}`,
        { name: 'Malicious Edit' },
        { headers: { Authorization: `Bearer ${tokenB}` } }
      );
      assert(false, 'Cross-tenant user modification should fail');
    } catch (err) {
      assert(err.response.status === 404, 'Admin B cannot modify user of Tenant A (404 Not Found)');
    }

    console.log('\n--- SCENARIO 3: Department Management & Member Assignment ---');
    const deptRes = await axios.post(
      `${baseUrl}/api/departments`,
      {
        name: 'Sales Division',
        description: 'Direct sales and territory pipeline'
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(deptRes.status === 201, 'Company Admin creates department inside Tenant A');
    const createdDept = deptRes.data.department;

    await axios.put(
      `${baseUrl}/api/users/${createdUserA._id}`,
      { departmentId: createdDept._id },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const deptsListRes = await axios.get(`${baseUrl}/api/departments`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const salesDept = deptsListRes.data.find((d) => String(d._id) === String(createdDept._id));
    assert(salesDept && salesDept.memberCount === 1, 'Department member count dynamically updates to 1');

    console.log('\n--- SCENARIO 4: Role Creation Within Enabled Features ---');
    const roleRes4 = await axios.post(
      `${baseUrl}/api/roles`,
      {
        name: 'Enterprise Sales Executive',
        department: 'Sales Division',
        permissions: ['lead.create', 'lead.view', 'order.create', 'order.view', 'inventory.view'],
        scopeType: 'REGION',
        scopeValues: ['West', 'North']
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(roleRes4.status === 201, 'Company Admin successfully creates role with allowed company features');
    const createdRoleDoc = roleRes4.data.role;

    console.log('\n--- SCENARIO 5: Role Creation Blocked for Disabled Features ---');
    try {
      await axios.post(
        `${baseUrl}/api/roles`,
        {
          name: 'Unauthorized Service Lead',
          department: 'Sales Division',
          permissions: ['service.create', 'service.view', 'lead.view']
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      assert(false, 'Role creation with disabled feature permissions should fail');
    } catch (err) {
      assert(err.response.status === 400, 'Role creation rejected with HTTP 400');
      assert(err.response.data.code === 'FEATURE_NOT_ENABLED_FOR_COMPANY', 'Returns code FEATURE_NOT_ENABLED_FOR_COMPANY');
    }

    console.log('\n--- SCENARIO 6: Commercial Boundary (Company Admin cannot turn features ON) ---');
    const featureCheck = validatePermissionsAgainstEntitlements(['service.create', 'finance.create'], companyA.features);
    assert(!featureCheck.isValid, 'Company A feature constraint engine strictly rejects service/finance permissions');
    assert(featureCheck.invalidPermissions.length === 2, 'Identified all invalid permissions violating company plan');

    console.log('\n--- SCENARIO 7: Role Template Generator Filters Plan-Disabled Permissions ---');
    const companyATemplates = getRoleTemplatesForCompany(companyA.features);
    const serviceMgrTemplate = companyATemplates['service-manager'];
    assert(
      !serviceMgrTemplate.permissions.includes('service.create'),
      'Built-in template dynamically strips out permissions for features not in company plan'
    );
    const salesMgrTemplate = companyATemplates['sales-manager'];
    assert(
      salesMgrTemplate.permissions.includes('lead.create') && salesMgrTemplate.permissions.includes('inventory.view'),
      'Built-in template retains permissions for features enabled in company plan'
    );

    console.log('\n--- SCENARIO 8: Role Duplication ---');
    const dupRes = await axios.post(
      `${baseUrl}/api/roles/${createdRoleDoc._id}/duplicate`,
      {},
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(dupRes.status === 201, 'Role duplicated successfully');
    assert(dupRes.data.role.name === 'Enterprise Sales Executive (Copy)', 'Duplicate role named "[Original] (Copy)"');

    console.log('\n--- SCENARIO 9: Active-User Role Deletion Guard ---');
    await axios.put(
      `${baseUrl}/api/users/${createdUserA._id}`,
      { customRoleId: createdRoleDoc._id },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    try {
      await axios.delete(`${baseUrl}/api/roles/${createdRoleDoc._id}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'Deleting role with active assigned users should fail');
    } catch (err) {
      assert(err.response.status === 400, 'Role deletion rejected with HTTP 400');
      assert(err.response.data.code === 'ROLE_HAS_ASSIGNED_USERS', 'Returns ROLE_HAS_ASSIGNED_USERS code');
    }

    console.log('\n--- SCENARIO 10: 5-Attempt Account Lockout Behavior ---');
    const targetEmail = 'rahul.sharma@alphadynamics.com';

    for (let i = 1; i <= 4; i++) {
      try {
        await axios.post(`${baseUrl}/api/auth/login`, {
          email: targetEmail,
          password: 'WrongPassword!'
        });
        assert(false, 'Bad login should fail');
      } catch (err) {
        assert(err.response.status === 401, `Attempt #${i} returns 401 Invalid credentials`);
        assert(err.response.data.remainingAttempts === 5 - i, `Remaining attempts tracked: ${5 - i}`);
      }
    }

    try {
      await axios.post(`${baseUrl}/api/auth/login`, {
        email: targetEmail,
        password: 'WrongPassword!'
      });
      assert(false, '5th bad login should trigger lockout');
    } catch (err) {
      assert(err.response.status === 423, '5th failed attempt triggers HTTP 423 Locked');
      assert(err.response.data.code === 'ACCOUNT_LOCKED', 'Returns ACCOUNT_LOCKED code');
    }

    const lockedDoc = await User.findOne({ email: targetEmail });
    assert(lockedDoc.isLocked === true && lockedDoc.status === 'LOCKED', 'Database flags user: isLocked=true, status=LOCKED');

    console.log('\n--- SCENARIO 11: Locked User Denied Even With Correct Password ---');
    try {
      await axios.post(`${baseUrl}/api/auth/login`, {
        email: targetEmail,
        password: 'Password123!'
      });
      assert(false, 'Locked user login should be denied');
    } catch (err) {
      assert(err.response.status === 423, 'Login denied while locked even with valid password (HTTP 423)');
    }

    console.log('\n--- SCENARIO 12: Company Admin Account Unlock ---');
    try {
      await axios.post(
        `${baseUrl}/api/users/${createdUserA._id}/unlock`,
        {},
        { headers: { Authorization: `Bearer ${tokenB}` } }
      );
      assert(false, 'Cross-tenant unlock should fail');
    } catch (err) {
      assert(err.response.status === 404, 'Admin B cannot unlock user of Company A (404)');
    }

    const unlockRes = await axios.post(
      `${baseUrl}/api/users/${createdUserA._id}/unlock`,
      {},
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(unlockRes.status === 200, 'Admin A unlocks own user successfully (HTTP 200)');

    const loginAfterUnlock = await axios.post(`${baseUrl}/api/auth/login`, {
      email: targetEmail,
      password: 'Password123!'
    });
    assert(loginAfterUnlock.status === 200, 'User can successfully login after unlock (HTTP 200)');

    console.log('\n--- SCENARIO 13: Soft Deactivation & History Preservation ---');
    const deactRes = await axios.delete(`${baseUrl}/api/users/${createdUserA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(deactRes.status === 200, 'Soft-deactivation succeeds (HTTP 200)');

    const deactDoc = await User.findById(createdUserA._id);
    assert(deactDoc.status === 'DISABLED' && deactDoc.isActive === false, 'User status set to DISABLED, record preserved in database');

    try {
      await axios.post(`${baseUrl}/api/auth/login`, {
        email: targetEmail,
        password: 'Password123!'
      });
      assert(false, 'Disabled user login should fail');
    } catch (err) {
      assert(err.response.status === 403, 'Disabled user login returns HTTP 403 Forbidden');
      assert(err.response.data.code === 'USER_DISABLED', 'Returns USER_DISABLED code');
    }

    console.log('\n--- SCENARIO 14: Data Scope Enforcement Engine ---');
    const mockReqRegion = {
      user: {
        id: createdUserA._id,
        role: 'sales-executive',
        scopeType: 'REGION',
        scopeValues: ['West', 'North']
      }
    };
    const regionFilter = applyDataScope(mockReqRegion, { companyId: companyA._id });
    assert(
      JSON.stringify(regionFilter.region) === JSON.stringify({ $in: ['West', 'North'] }),
      'applyDataScope filters by region: { $in: ["West", "North"] }'
    );

    const mockReqSelf = {
      user: {
        id: createdUserA._id,
        role: 'sales-executive',
        scopeType: 'SELF',
        scopeValues: []
      }
    };
    const selfFilter = applyDataScope(mockReqSelf, { companyId: companyA._id });
    assert(Array.isArray(selfFilter.$or), 'applyDataScope SELF filters by createdBy/userId/assignedTo');

    console.log('\n--- SCENARIO 15: Delegation Privilege Escalation Guard ---');
    const subAdminActor = {
      id: 'subadmin-1',
      role: 'sub-admin',
      permissions: ['lead.create', 'lead.view', 'order.create']
    };
    const delegationCheck = canUserDelegatePermissions(
      subAdminActor,
      ['lead.create', 'finance.create'],
      companyA.features
    );
    assert(!delegationCheck.isValid, 'Sub-admin lacking finance permission cannot delegate finance permissions');

    console.log('\n===============================================================');
    console.log(`🏁 RBAC TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');
  } catch (err) {
    console.error('Fatal error in RBAC test suite:', err);
    failed++;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runRbacTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runRbacTests };
