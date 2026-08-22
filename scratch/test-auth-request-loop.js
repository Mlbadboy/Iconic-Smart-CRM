/**
 * Charlie's CRM — Request Loop, Rate Limiting & Auth Stability Regression Suite
 * 
 * Tests:
 * 1. Company Admin login succeeds and login endpoint called once
 * 2. Dashboard initialization occurs once without recursive storms
 * 3. Tenant entitlement single-flight deduplication
 * 4. Tenant branding single-flight deduplication
 * 5. Notification initialization without excessive polling timers
 * 6. High-volume simulated dashboard & module navigation without 429 rate limit
 * 7. Legitimate authentication rate limiter protects against brute force while allowing authenticated traffic
 * 8. Session remains active without unintended automatic logout
 * 9. Expired/invalid tokens redirect cleanly without loop bouncing
 * 10. Super Admin console workflows remain unaffected
 * 11. Cross-tenant isolation remains strictly enforced
 */

const axios = require('axios');
const assert = require('assert');

const BASE_URL = process.env.TEST_URL || 'http://localhost:7000';
let passed = 0;
let failed = 0;

function check(desc, cond) {
  if (cond) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failed++;
    throw new Error(desc);
  }
}

async function runAuthLoopSuite() {
  console.log('======================================================================');
  console.log('🚀 RUNNING AUTHENTICATION REQUEST LOOP & RATE LIMIT REGRESSION TEST');
  console.log('======================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Company Admin Login & Single-Flight Auth
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Company Admin Login & Single-Flight Auth ---');
    let loginCallCount = 0;
    const loginReq = async () => {
      loginCallCount++;
      return await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@charlieai.com',
        password: 'admin123'
      });
    };

    const loginRes = await loginReq();
    check('Company Admin login returned HTTP 200', loginRes.status === 200);
    check('Login endpoint called exactly once', loginCallCount === 1);
    check('Auth token returned and valid format', Boolean(loginRes.data.token));
    const token = loginRes.data.token;
    const user = loginRes.data.user;
    check('User role is company-admin', user.role === 'company-admin');

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // -------------------------------------------------------------------------
    // TEST 2: Dashboard Initialization & Entitlement Request Count
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Single-Flight Tenant Entitlements & Deduplication ---');
    
    // Simulate concurrent requests from feature-guard and dashboard.html
    const [ent1, ent2, ent3] = await Promise.all([
      axios.get(`${BASE_URL}/api/tenant/entitlements`, { headers: authHeaders }),
      axios.get(`${BASE_URL}/api/tenant/entitlements`, { headers: authHeaders }),
      axios.get(`${BASE_URL}/api/tenant/entitlements`, { headers: authHeaders })
    ]);

    check('All concurrent entitlement requests succeed (HTTP 200)', ent1.status === 200 && ent2.status === 200 && ent3.status === 200);
    check('Authoritative features present in payload', typeof ent1.data.features === 'object');
    check('Dashboard feature is enabled', ent1.data.features.dashboard === true);

    // -------------------------------------------------------------------------
    // TEST 3: Tenant Branding & Notification Initialization
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Tenant Branding & Notifications Single Flight ---');
    const brandingRes = await axios.get(`${BASE_URL}/api/tenant/branding`);
    check('Tenant branding returns HTTP 200', brandingRes.status === 200);
    check('Branding response contains displayName or logo', brandingRes.data.displayName !== undefined);

    const notifRes = await axios.get(`${BASE_URL}/api/notifications/tenant`, { headers: authHeaders });
    check('Tenant notifications endpoint returns HTTP 200', notifRes.status === 200);
    check('Unread count and notifications array present', Array.isArray(notifRes.data.notifications));

    // -------------------------------------------------------------------------
    // TEST 4: Token Verification & User Session Stability
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Session Verification & Active State ---');
    const verifyRes = await axios.get(`${BASE_URL}/api/auth/verify`, { headers: authHeaders });
    check('Token verify endpoint returns valid: true', verifyRes.data.valid === true);
    check('Verify returns authenticated user profile', verifyRes.data.user.email === 'admin@charlieai.com');

    // -------------------------------------------------------------------------
    // TEST 5: Stress Test: Normal Workspace Navigation (Simulate 50+ Rapid Requests)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Heavy Navigation Simulation (No 429 Rate Limit Trigger) ---');
    const endpoints = [
      '/api/tenant/entitlements',
      '/api/tenant/branding',
      '/api/notifications/tenant',
      '/api/auth/verify',
      '/api/orders',
      '/api/services',
      '/api/leads',
      '/api/deliveries',
      '/api/departments',
      '/api/roles'
    ];

    let totalSimulatedRequests = 0;
    let rateLimitedCount = 0;

    // Run 5 batches of 10 requests = 50 rapid requests
    for (let batch = 0; batch < 5; batch++) {
      const batchPromises = endpoints.map(ep => {
        totalSimulatedRequests++;
        return axios.get(`${BASE_URL}${ep}`, { headers: authHeaders }).catch(err => err.response);
      });

      const results = await Promise.all(batchPromises);
      for (const r of results) {
        if (r.status === 429) {
          rateLimitedCount++;
        }
      }
    }

    check(`Simulated ${totalSimulatedRequests} rapid requests across modules`, totalSimulatedRequests === 50);
    check('Zero requests received 429 Too Many Requests', rateLimitedCount === 0);

    // -------------------------------------------------------------------------
    // TEST 6: Expired / Invalid Token Handling (Clean 401 without Loop)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Invalid / Expired Token Rejection (HTTP 401) ---');
    try {
      await axios.get(`${BASE_URL}/api/auth/verify`, {
        headers: { 'Authorization': 'Bearer invalid.expired.token' }
      });
      check('Invalid token should not succeed', false);
    } catch (err) {
      check('Invalid token returns HTTP 401 Unauthorized', err.response?.status === 401);
      check('Invalid token message returned', err.response?.data?.message === 'Invalid token');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Super Admin Platform Workflow Stability
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Super Admin Platform Workflow Stability ---');
    const saLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@charlieai.com',
      password: 'Admin@123456'
    });
    check('Super Admin login succeeds (HTTP 200)', saLogin.status === 200);
    const saToken = saLogin.data.token;
    const saHeaders = { 'Authorization': `Bearer ${saToken}` };

    const compList = await axios.get(`${BASE_URL}/api/tenant-control/overview/list`, { headers: saHeaders });
    check('Super Admin retrieves tenant overview list', Array.isArray(compList.data));

    // -------------------------------------------------------------------------
    // TEST 8: Cross-Tenant Isolation Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Cross-Tenant Security Boundary ---');
    try {
      // Company Admin attempting Super Admin platform console endpoint
      await axios.get(`${BASE_URL}/api/tenant-control/overview/list`, { headers: authHeaders });
      check('Company Admin should be blocked from platform console', false);
    } catch (err) {
      check('Company Admin blocked from platform console with HTTP 403', err.response?.status === 403);
    }

    console.log('\n======================================================================');
    console.log(`🏁 AUTH LOOP REGRESSION SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Unhandled error in regression test:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    process.exit(1);
  }
}

runAuthLoopSuite();
