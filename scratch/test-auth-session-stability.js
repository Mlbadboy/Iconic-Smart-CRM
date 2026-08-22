const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');

async function testAuthSessionStability() {
  console.log('========================================================================');
  console.log('🚀 AUTH SESSION STABILITY & 403 / FEATURE GATE RESILIENCE VERIFICATION');
  console.log('========================================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'charlie-session-stability-test-secret-123';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);

  const Company = require('../models/Company');
  const User = require('../models/User');

  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/tenant', require('../routes/tenant'));
  app.use('/api/social-marketing', require('../routes/socialMarketing'));
  app.use('/api/whatsapp', require('../routes/whatsapp'));

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Provision Company with Marketing enabled, but WhatsApp disabled
    const company = await Company.create({
      name: 'Session Resilience Corp',
      code: 'SRC_01',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          whatsapp: false, // Explicitly disabled
          social: true,
          meta_ads: true
        }
      }
    });

    const user = await User.create({
      name: 'Session Admin',
      email: 'admin@resilience.com',
      password: 'password123',
      role: 'company-admin',
      companyId: company._id,
      isActive: true
    });
    const token = jwt.sign({ id: user._id, email: user.email, role: 'company-admin', companyId: company._id }, process.env.JWT_SECRET);

    console.log('--- 1. Testing Normal Auth Endpoint (HTTP 200) ---');
    const tenantRes = await axios.get(`${BASE_URL}/api/tenant/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(tenantRes.status === 200 && tenantRes.data.company.name === 'Session Resilience Corp', 'Valid user token successfully authenticates');

    console.log('\n--- 2. Testing 403 Forbidden Feature Gate (Should Not Invalidate Session) ---');
    let blocked403 = false;
    try {
      await axios.get(`${BASE_URL}/api/whatsapp/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      if (err.response?.status === 403) {
        blocked403 = true;
      }
    }
    assert(blocked403 === true, 'Disabled subfeature returns HTTP 403 FEATURE_NOT_ENABLED');

    // Verify token is still 100% valid immediately after 403
    const post403Res = await axios.get(`${BASE_URL}/api/tenant/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(post403Res.status === 200, 'Session remains active and authenticated after receiving 403');

    console.log('\n--- 3. Testing Concurrent API Calls (No Race Condition Invalidation) ---');
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(axios.get(`${BASE_URL}/api/tenant/me`, { headers: { Authorization: `Bearer ${token}` } }));
    }
    const results = await Promise.all(promises);
    const all200 = results.every(r => r.status === 200);
    assert(all200 === true, 'All 20 concurrent requests succeeded without session drops');

    console.log('\n--- 4. Testing 401 Unauthorized on Invalid Token ---');
    let rejected401 = false;
    try {
      await axios.get(`${BASE_URL}/api/tenant/me`, {
        headers: { Authorization: 'Bearer invalid_garbage_token' }
      });
    } catch (err) {
      if (err.response?.status === 401) rejected401 = true;
    }
    assert(rejected401 === true, 'Invalid token returns HTTP 401 Unauthorized');

    console.log('\n========================================================================');
    console.log(`🏁 AUTH SESSION STABILITY RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
    server.close();
    process.exit(1);
  }
}

testAuthSessionStability();
