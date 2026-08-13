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

  console.log('CRM audit regression checks passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
