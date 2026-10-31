const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const SerialRegistry = require('../models/SerialRegistry');
const AuditEvent = require('../models/AuditEvent');

const serialRegistryRouter = require('../routes/serialRegistry');
const tenantControlRouter = require('../routes/tenantControl');

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

async function runTests() {
  console.log('🚀 Running Serial Edit, Delete, and Audit Log Integration Tests...\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());

  // Mount routers
  app.use('/api/v1/serial-registry', serialRegistryRouter);
  app.use('/api/tenant-control', tenantControlRouter);

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`  Test HTTP Server running at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    const JWT_SECRET = 'test-jwt-secret-key-must-be-at-least-32-chars-long-12345';
    process.env.JWT_SECRET = JWT_SECRET;

    // 1. Setup Test Companies
    const compA = await Company.create({
      name: 'Tenant Alpha',
      code: 'ALPHA',
      subdomain: 'alpha',
      isActive: true,
      features: { inventory: true, serial_validation: true }
    });

    const compB = await Company.create({
      name: 'Tenant Beta',
      code: 'BETA',
      subdomain: 'beta',
      isActive: true,
      features: { inventory: true, serial_validation: true }
    });

    // 2. Setup Test Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const userA = await User.create({
      name: 'Manager Alpha',
      email: 'manager@alpha.com',
      password: hashedPassword,
      companyId: compA._id,
      role: 'manager'
    });

    const userB = await User.create({
      name: 'Manager Beta',
      email: 'manager@beta.com',
      password: hashedPassword,
      companyId: compB._id,
      role: 'manager'
    });

    const superAdminUser = await User.create({
      name: 'Super Admin',
      email: 'superadmin@crm.com',
      password: hashedPassword,
      role: 'superadmin'
    });

    const tokenA = jwt.sign({ id: userA._id, companyId: compA._id, role: userA.role }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: userB._id, companyId: compB._id, role: userB.role }, JWT_SECRET, { expiresIn: '1h' });
    const tokenSuper = jwt.sign({ id: superAdminUser._id, role: 'superadmin' }, JWT_SECRET, { expiresIn: '1h' });

    // 3. Create initial serial unit for Company A
    const serialDoc = await SerialRegistry.create({
      companyId: compA._id,
      materialCode: 'MAT-WRONG-01',
      serialNumber: 'SN-MISTAKE-999',
      dealerCode: 'DLR-WRONG-11',
      status: 'IN_STOCK',
      customer: 'Old Customer',
      batchNumber: 'BATCH-001'
    });

    console.log('--- TEST GROUP 1: PUT /api/v1/serial-registry/:id (Edit Mistaken Serial) ---');

    // 4. Test modifying the serial by Tenant A
    const editRes = await axios.put(`${baseUrl}/api/v1/serial-registry/${serialDoc._id}`, {
      materialCode: 'MAT-CORRECTED-01',
      serialNumber: 'SN-CORRECTED-999',
      dealerCode: 'DLR-CORRECTED-11',
      customer: 'New Customer',
      status: 'IN_STOCK'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(editRes.status === 200, 'PUT serial returns 200 OK');
    assert(editRes.data.data.serialNumber === 'SN-CORRECTED-999', 'Returned serial has updated serialNumber');
    assert(editRes.data.data.materialCode === 'MAT-CORRECTED-01', 'Returned serial has updated materialCode');

    // Verify in database
    const updatedInDb = await SerialRegistry.findById(serialDoc._id);
    assert(updatedInDb.serialNumber === 'SN-CORRECTED-999', 'Database reflects updated serialNumber');
    assert(updatedInDb.materialCode === 'MAT-CORRECTED-01', 'Database reflects updated materialCode');
    assert(updatedInDb.dealerCode === 'DLR-CORRECTED-11', 'Database reflects updated dealerCode');

    // Verify Audit Event created
    const editAuditEvent = await AuditEvent.findOne({ action: 'serial.edit', entityId: String(serialDoc._id) });
    assert(!!editAuditEvent, 'AuditEvent for serial.edit was created');
    assert(editAuditEvent.actorId.toString() === userA._id.toString(), 'Audit event records correct actorId');
    assert(editAuditEvent.previousValue.serialNumber === 'SN-MISTAKE-999', 'Audit previousValue captures old serialNumber');
    assert(editAuditEvent.newValue.serialNumber === 'SN-CORRECTED-999', 'Audit newValue captures new serialNumber');

    console.log('\n--- TEST GROUP 2: Tenant Scoping & Isolation on Edit ---');

    // 5. Test that Tenant B CANNOT edit Tenant A's serial
    let tenantBBlocked = false;
    try {
      await axios.put(`${baseUrl}/api/v1/serial-registry/${serialDoc._id}`, {
        serialNumber: 'SN-HACKED-BY-B'
      }, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
    } catch (err) {
      tenantBBlocked = err.response && err.response.status === 404;
    }
    assert(tenantBBlocked, 'Tenant B is blocked from modifying Tenant A serial (404 Not Found)');

    console.log('\n--- TEST GROUP 3: DELETE /api/v1/serial-registry/:id (Delete Mistaken Serial) ---');

    // 6. Test that Tenant B CANNOT delete Tenant A's serial
    let tenantBDeleteBlocked = false;
    try {
      await axios.delete(`${baseUrl}/api/v1/serial-registry/${serialDoc._id}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
    } catch (err) {
      tenantBDeleteBlocked = err.response && err.response.status === 404;
    }
    assert(tenantBDeleteBlocked, 'Tenant B is blocked from deleting Tenant A serial (404 Not Found)');

    // 7. Tenant A deletes their mistaken serial
    const deleteRes = await axios.delete(`${baseUrl}/api/v1/serial-registry/${serialDoc._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(deleteRes.status === 200, 'DELETE serial returns 200 OK');

    // Verify serial removed from DB
    const deletedInDb = await SerialRegistry.findById(serialDoc._id);
    assert(!deletedInDb, 'Serial document is removed from database');

    // Verify Audit Event created for delete
    const deleteAuditEvent = await AuditEvent.findOne({ action: 'serial.delete', entityId: String(serialDoc._id) });
    assert(!!deleteAuditEvent, 'AuditEvent for serial.delete was created');
    assert(deleteAuditEvent.actorId.toString() === userA._id.toString(), 'Audit event records correct actorId');
    assert(deleteAuditEvent.previousValue.serialNumber === 'SN-CORRECTED-999', 'Audit captures snapshot of deleted document');

    console.log('\n--- TEST GROUP 4: Super Admin Audit Log Viewer Security & Access ---');

    // 8. Non-superadmin cannot access audit logs
    let nonSuperAdminBlocked = false;
    try {
      await axios.get(`${baseUrl}/api/tenant-control/audit-logs`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (err) {
      nonSuperAdminBlocked = err.response && (err.response.status === 403 || err.response.status === 401);
    }
    assert(nonSuperAdminBlocked, 'Regular tenant user is blocked from viewing audit logs (403 Forbidden)');

    // 9. Superadmin can access audit logs
    const auditRes = await axios.get(`${baseUrl}/api/tenant-control/audit-logs`, {
      headers: { Authorization: `Bearer ${tokenSuper}` }
    });
    assert(auditRes.status === 200, 'Super admin successfully retrieves audit logs (200 OK)');
    assert(Array.isArray(auditRes.data.data.logs), 'Audit logs returned as array');
    assert(auditRes.data.data.logs.length >= 2, 'Audit logs contain both edit and delete events');

    const actions = auditRes.data.data.logs.map(l => l.action);
    assert(actions.includes('serial.edit'), 'Logs contain serial.edit');
    assert(actions.includes('serial.delete'), 'Logs contain serial.delete');

    console.log(`\n🎉 ALL TESTS PASSED! (${passed} passed, 0 failed)\n`);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.response?.data || err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runTests();
