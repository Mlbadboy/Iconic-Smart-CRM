process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt';
process.env.NODE_ENV = 'test';

const assert = require('assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const serviceRequestsRouter = require('./routes/serviceRequests');
const fs = require('fs');
const path = require('path');
const { hasPermission } = require('./middleware/rbac');
const { assertTransition, getTransitions } = require('./services/workflowService');
const Counter = require('./models/Counter');
const ServiceCenter = require('./models/ServiceCenter');
const ServiceRequest = require('./models/ServiceRequest');
const SlaTimer = require('./models/SlaTimer');
const Escalation = require('./models/Escalation');
const ApprovalRequest = require('./models/ApprovalRequest');
const Task = require('./models/Task');
const { nextSequence } = require('./services/sequenceService');
const dashboardSource = fs.readFileSync(path.join(__dirname, 'routes/dashboard.js'), 'utf8');
const auditModelSource = fs.readFileSync(path.join(__dirname, 'models/AuditEvent.js'), 'utf8');
const orderModelSource = fs.readFileSync(path.join(__dirname, 'models/Order.js'), 'utf8');
const serviceModelSource = fs.readFileSync(path.join(__dirname, 'models/ServiceRequest.js'), 'utf8');
const routeSources = ['leads', 'opportunities', 'orders', 'serviceRequests', 'services', 'deliveries', 'marketing', 'users', 'dashboard', 'config']
  .map(route => fs.readFileSync(path.join(__dirname, `routes/${route}.js`), 'utf8'))
  .join('\n');
const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

function routeLayer(router, method, path) {
  return router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
}

async function runHandlers(layer, req, { skipMiddleware = false } = {}) {
  const res = createRes();
  const stack = skipMiddleware ? [layer.route.stack[layer.route.stack.length - 1]] : layer.route.stack;
  for (const stackItem of stack) {
    await new Promise((resolve, reject) => {
      const maybePromise = stackItem.handle(req, res, error => error ? reject(error) : resolve());
      if (maybePromise && typeof maybePromise.then === 'function') maybePromise.then(resolve, reject);
    });
    if (res.body !== undefined) break;
  }
  return res;
}

async function main() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  // RBAC regression: permissions are centralized and enforced by policy decisions.
  assert.strictEqual(hasPermission({ role: 'admin' }, 'user.disable'), true);
  assert.strictEqual(hasPermission({ role: 'service-agent' }, 'service.edit'), true);
  assert.strictEqual(hasPermission({ role: 'service-agent' }, 'user.disable'), false);
  assert.strictEqual(hasPermission({ role: 'admin' }, 'users.delete'), true, 'legacy plural aliases should still resolve');
  assert(!/req\.user\.role\s*[!=]==/.test(routeSources), 'protected routes should not use direct role comparison for authorization');

  // Workflow regression: state transitions are centralized and reject invalid moves.
  assert.deepStrictEqual(getTransitions('lead', 'converted'), []);
  assertTransition('order', 'confirmed', 'processing');
  assert.throws(() => assertTransition('opportunity', 'closed-lost', 'negotiation'), /Invalid opportunity transition/);

  // Customer 360 regression: versioned aggregate route is mounted.
  assert(serverSource.includes("/api/v1/customers"), 'Customer 360 v1 route should be mounted');

  // Audit trail regression: audit events are modeled as append-only records.
  assert(auditModelSource.includes('append-only'), 'audit events should explicitly reject mutation/deletion middleware');
  assert(auditModelSource.includes("timestamps: { createdAt: true, updatedAt: false }"), 'audit events should capture immutable creation time only');

  // Identifier regression: business IDs use the sequence service, not countDocuments-based generation.
  assert(orderModelSource.includes("nextSequence('orders'"), 'orders should use atomic sequence generation');
  assert(serviceModelSource.includes("nextSequence('service-requests'"), 'service requests should use atomic sequence generation');

  const originalFindOneAndUpdate = Counter.findOneAndUpdate;
  let counterValue = 0;
  Counter.findOneAndUpdate = async (query, update, options) => {
    assert.deepStrictEqual(query, { key: 'regression' });
    assert.deepStrictEqual(update, { $inc: { value: 1 } });
    assert.strictEqual(options.upsert, true);
    counterValue += 1;
    return { value: counterValue };
  };
  const generatedIds = await Promise.all([
    nextSequence('regression', { prefix: 'T', pad: 3 }),
    nextSequence('regression', { prefix: 'T', pad: 3 }),
    nextSequence('regression', { prefix: 'T', pad: 3 })
  ]);
  assert.deepStrictEqual(generatedIds, ['T001', 'T002', 'T003']);
  Counter.findOneAndUpdate = originalFindOneAndUpdate;

  // Dashboard ownership regression: non-admin users must query their Order.userId, not a nonexistent createdBy field.
  assert(dashboardSource.includes('{ userId: req.user.id }'), 'dashboard routes should filter non-admin records by userId');
  assert(!dashboardSource.includes('{ createdBy: req.user.id }'), 'dashboard routes must not filter by nonexistent createdBy');

  // Registration security: once users exist, anonymous self-registration/admin escalation is rejected.
  const originalEstimatedDocumentCount = mongoose.Model.estimatedDocumentCount;
  const originalFindOne = mongoose.Model.findOne;
  mongoose.Model.estimatedDocumentCount = async () => 1;
  mongoose.Model.findOne = async () => null;
  const registerLayer = routeLayer(authRouter, 'post', '/register');
  const anonymousRegister = await runHandlers(registerLayer, {
    body: { name: 'Eve', email: 'eve@example.com', password: 'password123', role: 'admin' },
    header: () => undefined
  });
  assert.strictEqual(anonymousRegister.statusCode, 401);

  const userToken = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'user' }, process.env.JWT_SECRET);
  const nonAdminRegister = await runHandlers(registerLayer, {
    body: { name: 'Eve', email: 'eve@example.com', password: 'password123', role: 'admin' },
    header: () => `Bearer ${userToken}`
  });
  assert.strictEqual(nonAdminRegister.statusCode, 403);
  mongoose.Model.estimatedDocumentCount = originalEstimatedDocumentCount;
  mongoose.Model.findOne = originalFindOne;

  // Order validation: empty items are rejected before database writes.
  const createOrderLayer = routeLayer(ordersRouter, 'post', '/');
  const invalidOrder = await runHandlers(createOrderLayer, {
    body: { items: [], gstRate: 18 },
    user: { id: '507f1f77bcf86cd799439011', role: 'admin' },
    app: { get: () => null }
  }, { skipMiddleware: true });
  assert.strictEqual(invalidOrder.statusCode, 400);

  // Service state machine: a closed service request cannot be re-opened or mutated by invalid transition.
  const originalFindById = mongoose.Model.findById;
  mongoose.Model.findById = async () => ({
    _id: '507f1f77bcf86cd799439012',
    userId: '507f1f77bcf86cd799439011',
    status: 'closed',
    save: async () => {}
  });
  const statusLayer = routeLayer(serviceRequestsRouter, 'patch', '/:id/status');
  const invalidTransition = await runHandlers(statusLayer, {
    params: { id: '507f1f77bcf86cd799439012' },
    body: { status: 'open' },
    user: { id: '507f1f77bcf86cd799439011', role: 'user' }
  }, { skipMiddleware: true });
  assert.strictEqual(invalidTransition.statusCode, 409);
  mongoose.Model.findById = originalFindById;

  // Real database test for business engines if MONGO_URI is active
  if (process.env.MONGO_URI) {
    const slaService = require('./services/slaService');
    const escalationService = require('./services/escalationService');
    const approvalService = require('./services/approvalService');
    const taskService = require('./services/taskService');

    // Test SLA Timer Creation
    console.log('🧪 Testing SLA Timer Service...');
    const timer = await slaService.createTimer('service-request', '507f1f77bcf86cd799439099', 'urgent', 'response');
    assert.strictEqual(timer.status, 'active');
    assert.strictEqual(timer.slaType, 'response');

    // Test SLA Timer Completion
    await slaService.completeTimer('service-request', '507f1f77bcf86cd799439099', 'response');
    const completedTimer = await mongoose.model('SlaTimer').findById(timer._id);
    assert.strictEqual(completedTimer.status, 'completed');

    // Test Escalation
    console.log('🧪 Testing Escalation Service...');
    let serviceCenterId = new mongoose.Types.ObjectId();
    const sc = new ServiceCenter({
      _id: serviceCenterId,
      name: 'Test SC',
      email: 'sc@example.com',
      phone: '1234567890',
      address: 'Test Street, Test City',
      gstNumber: 'GST123456'
    });
    await sc.save();

    const sr = new ServiceRequest({
      _id: '507f1f77bcf86cd799439098',
      serviceCenterId: serviceCenterId,
      serviceCenterName: 'Test SC',
      serviceCenterEmail: 'sc@example.com',
      serviceType: 'repair',
      productType: 'LED TV',
      serialNumber: 'SN12345',
      description: 'Broken TV',
      issueType: 'technical',
      status: 'open',
      priority: 'high'
    });
    await sr.save();

    const escTimer = await slaService.createTimer('service-request', sr._id.toString(), 'urgent', 'resolution');
    const escalation = await escalationService.escalateBreach(escTimer, null);
    assert.strictEqual(escalation.status, 'open');
    assert.strictEqual(escalation.escalatedTo, 'service-manager');

    // Resolve Escalation
    await escalationService.resolveEscalation(escalation._id, 'admin@charlieai.com', 'Resolved breach');
    const resolvedEsc = await mongoose.model('Escalation').findById(escalation._id);
    assert.strictEqual(resolvedEsc.status, 'resolved');

    // Test Approval Engine
    console.log('🧪 Testing Approval Engine...');
    const reqId = new mongoose.Types.ObjectId();
    const appRequest = await approvalService.createRequest('order', 'ORD-999', reqId, 'order_limit', 150000, 'Exceeded limits');
    assert.strictEqual(appRequest.status, 'pending');

    // Segregation of Duties Check
    console.log('🧪 Testing Segregation of Duties Check...');
    await assert.rejects(
      async () => {
        await approvalService.approveRequest(appRequest._id, reqId, 'My own approval');
      },
      /Segregation of duties/
    );

    // Approve from separate user
    const separateApprover = new mongoose.Types.ObjectId();
    await approvalService.approveRequest(appRequest._id, separateApprover, 'Approved by separate manager');
    const approvedRequest = await mongoose.model('ApprovalRequest').findById(appRequest._id);
    assert.strictEqual(approvedRequest.status, 'approved');

    // Test Tasks / Work Queue Engine
    console.log('🧪 Testing Tasks Engine...');
    const task = await taskService.createTask('Follow up client', 'Call Acme', reqId, new Date(), 'high', 'lead', 'LEAD-001', 'Lead');
    assert.strictEqual(task.status, 'pending');

    await taskService.completeTask(task._id);
    const completedTask = await mongoose.model('Task').findById(task._id);
    assert.strictEqual(completedTask.status, 'completed');

    // Test Serial Number Validation Service & Mock External API
    console.log('🧪 Testing Serial Number Validation Service & API Mocking...');
    const serialValidationService = require('./services/serialValidationService');
    const axios = require('axios');
    const originalPost = axios.post;

    // Set configuration variables
    process.env.SERIAL_VALIDATION_ACCESS_KEY = 'super-secret-validation-key-123';
    process.env.SERIAL_VALIDATION_TIMEOUT = '3000';

    axios.post = async (url, data, config) => {
      if (url.includes('validatesno.asp')) {
        // Enforce that the access key is passed and matches our server secret
        assert.strictEqual(data.accessKey, 'super-secret-validation-key-123');

        const sNo = data.serialNumber;
        if (sNo === 'TIMEOUT_SNO') {
          throw new Error('connect ETIMEDOUT');
        }
        if (sNo === 'MALFORMED_SNO') {
          return { data: 'invalid string response' };
        }
        if (sNo === 'UNKNOWN_SNO') {
          return { data: { responseStatus: '99', responseMessage: 'Unknown Error' } };
        }

        let responseStatus = '0';
        let responseMessage = 'Valid Serial Number';

        if (sNo === 'INVALID_SNO') {
          responseStatus = '-1';
          responseMessage = 'Invalid Serial Number';
        } else if (sNo === 'MISMATCH_SNO') {
          responseStatus = '-2';
          responseMessage = 'Model / Serial Number Mismatch';
        } else if (sNo === 'ALREADY_SNO') {
          responseStatus = '-3';
          responseMessage = 'Serial Number Already Validated';
        } else if (sNo === 'INVALID_MAT') {
          responseStatus = '-4';
          responseMessage = 'Invalid Material Code';
        } else if (sNo === 'DEALER_MISMATCH_SNO') {
          responseStatus = '-5';
          responseMessage = 'Serial Number Not Billed To This Dealer';
        }

        return {
          data: {
            responseStatus,
            responseMessage
          }
        };
      }
      return originalPost(url, data, config);
    };

    const mockReq = {
      user: { id: reqId, role: 'sales' },
      correlationId: 'test-corr-id-999',
      ip: '127.0.0.1'
    };

    // 1. Success validation (status 0)
    console.log('🧪 Testing status 0 (VALID)');
    const res0 = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'VALID_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(res0.success, true);
    assert.strictEqual(res0.verified, true);
    assert.strictEqual(res0.canProceed, true);
    assert.strictEqual(res0.status, 'VALID');

    // Verify audit log entry
    const auditLog = await mongoose.model('AuditEvent').findOne({ action: 'serial.validate' });
    assert(auditLog);
    // Verify secret was NOT leaked in audit logs
    assert.strictEqual(JSON.stringify(auditLog).includes('super-secret-validation-key-123'), false);
    // Verify serial number was masked in audit logs
    assert.strictEqual(auditLog.newValue.serialNumber, '*****_SNO');

    // Verify history entry
    const historyEntry = await mongoose.model('SerialValidationHistory').findOne({ serialNumber: 'VALID_SNO' });
    assert(historyEntry);
    assert.strictEqual(historyEntry.validationResult, 'VALID');
    // Verify secret was NOT leaked in database history
    assert.strictEqual(JSON.stringify(historyEntry).includes('super-secret-validation-key-123'), false);

    // 2. Invalid serial (status -1)
    console.log('🧪 Testing status -1 (INVALID_SERIAL)');
    const res1 = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'INVALID_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(res1.verified, false);
    assert.strictEqual(res1.canProceed, false);
    assert.strictEqual(res1.status, 'INVALID_SERIAL');

    // 3. Model mismatch (status -2)
    console.log('🧪 Testing status -2 (MODEL_SERIAL_MISMATCH)');
    const res2 = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'MISMATCH_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(res2.verified, false);
    assert.strictEqual(res2.canProceed, false);
    assert.strictEqual(res2.status, 'MODEL_SERIAL_MISMATCH');

    // 4. Already validated (status -3)
    console.log('🧪 Testing status -3 (ALREADY_VALIDATED)');
    const res3 = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'ALREADY_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(res3.verified, false);
    assert.strictEqual(res3.canProceed, false);
    assert.strictEqual(res3.alreadyValidated, true);
    assert.strictEqual(res3.status, 'ALREADY_VALIDATED');

    // 5. Invalid material (status -4)
    console.log('🧪 Testing status -4 (INVALID_MATERIAL_CODE)');
    const res4 = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'INVALID_MAT',
      serialNumber: 'INVALID_MAT',
      dealerCode: 'D-001'
    });
    assert.strictEqual(res4.verified, false);
    assert.strictEqual(res4.canProceed, false);
    assert.strictEqual(res4.status, 'INVALID_MATERIAL_CODE');

    // 6. Dealer mismatch (status -5)
    console.log('🧪 Testing status -5 (DEALER_MISMATCH)');
    const res5 = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'DEALER_MISMATCH_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(res5.verified, false);
    assert.strictEqual(res5.canProceed, false);
    assert.strictEqual(res5.status, 'DEALER_MISMATCH');

    // 7. Unknown status
    console.log('🧪 Testing unknown status mapping');
    const resUnknown = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'UNKNOWN_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(resUnknown.verified, false);
    assert.strictEqual(resUnknown.canProceed, false);
    assert.strictEqual(resUnknown.status, 'UNKNOWN_RESPONSE');

    // 8. Timeout handling
    console.log('🧪 Testing timeout mapping');
    const resTimeout = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'TIMEOUT_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(resTimeout.success, false);
    assert.strictEqual(resTimeout.verified, false);
    assert.strictEqual(resTimeout.canProceed, false);
    assert.strictEqual(resTimeout.status, 'SERVICE_UNAVAILABLE');

    // 9. Malformed response handling
    console.log('🧪 Testing malformed response mapping');
    const resMalformed = await serialValidationService.validateSerialNumber(mockReq, {
      materialCode: 'MAT-001',
      serialNumber: 'MALFORMED_SNO',
      dealerCode: 'D-001'
    });
    assert.strictEqual(resMalformed.success, false);
    assert.strictEqual(resMalformed.verified, false);
    assert.strictEqual(resMalformed.canProceed, false);
    assert.strictEqual(resMalformed.status, 'SERVICE_UNAVAILABLE');

    // Restore axios
    axios.post = originalPost;
  }

  console.log('CRM audit regression checks passed');
  if (process.env.MONGO_URI) {
    await mongoose.connection.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
