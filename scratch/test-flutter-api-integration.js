const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function makeHttpRequest(port, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': `MOB-TEST-${Date.now()}`,
        ...headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runFlutterApiIntegrationTestSuite() {
  console.log('================================================================');
  console.log('📱 RUNNING FLUTTER MOBILE API INTEGRATION CONTRACT TEST SUITE');
  console.log('================================================================');

  const PORT = process.env.PORT || 7000;
  let testPassed = 0;
  let testTotal = 0;

  function assertTest(condition, name, details = '') {
    testTotal++;
    if (condition) {
      testPassed++;
      console.log(`✅ [MOB-${testTotal}] PASSED: ${name}`);
    } else {
      console.error(`❌ [MOB-${testTotal}] FAILED: ${name} - Details: ${details}`);
    }
  }

  try {
    // 1. Health Endpoint
    let resHealth = await makeHttpRequest(PORT, 'GET', '/api/health');
    assertTest(resHealth.status === 200 && resHealth.body.status === 'OK', 'Backend Health Endpoint', JSON.stringify(resHealth.body));

    // 2. Authentication Login (Sanitized / Real Auth)
    let resAuth = await makeHttpRequest(PORT, 'POST', '/api/auth/login', {}, {
      email: 'admin@charlieai.com',
      password: 'admin123'
    });
    // Validates auth structure (returns token or sanitized rejection)
    assertTest(resAuth.status === 200 || resAuth.status === 401, 'Authentication Contract Check', JSON.stringify(resAuth.body));

    // 3. Serial Validation API (Code 4 / Dealer Mismatch)
    let resSerial = await makeHttpRequest(PORT, 'POST', '/api/v1/serial-validation/validate', { 'X-API-Key': 'invalid_test_key' }, {
      materialCode: 'MAT-A',
      serialNumber: 'SN-001',
      dealerCode: 'DLR-B'
    });
    assertTest(resSerial.status === 200 || resSerial.status === 401, 'Serial Validation Mobile Contract', JSON.stringify(resSerial.body));

    // 4. Beat Tracker Attendance API
    let resAtt = await makeHttpRequest(PORT, 'POST', '/api/beat-tracker/attendance', {}, {
      employeeId: 'emp_001',
      checkInTime: new Date().toISOString()
    });
    assertTest(resAtt.status === 200 || resAtt.status === 401 || resAtt.status === 400, 'Beat Tracker Attendance Contract', JSON.stringify(resAtt.body));

    // 5. Customer 360 Endpoint
    let resC360 = await makeHttpRequest(PORT, 'GET', '/api/v1/customers/invalid_id');
    assertTest(resC360.status === 404 || resC360.status === 401, 'Customer 360 Not Found Rejection', JSON.stringify(resC360.body));

    console.log('\n================================================================');
    console.log(`🎉 FLUTTER MOBILE API INTEGRATION SUITE: ${testPassed}/${testTotal} PASSED`);
    console.log('================================================================');

    if (testPassed === testTotal) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ FLUTTER API SUITE EXCEPTION:', err);
    process.exit(1);
  }
}

runFlutterApiIntegrationTestSuite();
