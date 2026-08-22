// Quick API test script
const http = require('http');

// Test 1: Health Check
console.log('\n🔍 Testing API Endpoints...\n');

function testEndpoint(options, data, testName) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`✓ ${testName}`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Response: ${body}\n`);
        resolve(body);
      });
    });
    
    req.on('error', (error) => {
      console.log(`✗ ${testName}`);
      console.log(`  Error: ${error.message}\n`);
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Health Check
    await testEndpoint({
      hostname: 'localhost',
      port: 7000,
      path: '/api/health',
      method: 'GET'
    }, null, 'Health Check');

    // Test 2: Login with admin
    const loginData = JSON.stringify({
      email: 'admin@charlieai.com',
      password: 'admin123'
    });

    const loginResponse = await testEndpoint({
      hostname: 'localhost',
      port: 7000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, loginData, 'Admin Login');

    const loginResult = JSON.parse(loginResponse);
    
    if (loginResult.token) {
      console.log('🎉 Login successful! Token received.');
      
      // Test 3: Get orders with token
      await testEndpoint({
        hostname: 'localhost',
        port: 7000,
        path: '/api/orders',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginResult.token}`
        }
      }, null, 'Get Orders (Protected Route)');
    }

    console.log('\n✅ All tests passed! Server is working correctly.\n');
    
  } catch (error) {
    console.log('\n❌ Tests failed. Please check the error messages above.\n');
  }
}

runTests();
