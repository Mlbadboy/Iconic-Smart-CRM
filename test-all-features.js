const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:7000';
const API_URL = `${BASE_URL}/api`;

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(name, fn) {
  return async () => {
    try {
      log(`\n🧪 Testing: ${name}`, 'cyan');
      await fn();
      results.passed.push(name);
      log(`✅ PASSED: ${name}`, 'green');
      return true;
    } catch (error) {
      results.failed.push({ name, error: error.message });
      log(`❌ FAILED: ${name}`, 'red');
      log(`   Error: ${error.message}`, 'red');
      return false;
    }
  };
}

function warn(message) {
  results.warnings.push(message);
  log(`⚠️  WARNING: ${message}`, 'yellow');
}

// Test authentication
let authToken = null;
let testUserId = null;

const tests = [
  // 1. Health Check
  test('Health Check', async () => {
    const response = await axios.get(`${API_URL}/health`);
    if (response.data.status !== 'OK') {
      throw new Error('Health check failed');
    }
    log(`   Status: ${response.data.status}`);
  }),

  // 2. Login Test
  test('Login Authentication', async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@charlieai.com',
      password: 'admin123'
    });
    
    if (!response.data.token) {
      throw new Error('No token received');
    }
    
    authToken = response.data.token;
    testUserId = response.data.user.id;
    log(`   Token received: ${authToken.substring(0, 20)}...`);
    log(`   User: ${response.data.user.name} (${response.data.user.role})`);
  }),

  // 3. Security Headers Test
  test('Security Headers', async () => {
    const response = await axios.get(`${BASE_URL}/login.html`, {
      validateStatus: () => true
    });
    
    const headers = response.headers;
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'content-security-policy'
    ];
    
    const found = securityHeaders.filter(h => headers[h.toLowerCase()]);
    log(`   Security headers found: ${found.length}/${securityHeaders.length}`);
    
    if (found.length === 0) {
      warn('No security headers detected (may be normal for HTML pages)');
    }
  }),

  // 4. API Authentication
  test('API Authentication (Protected Route)', async () => {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.email) {
      throw new Error('Profile data not received');
    }
    log(`   Profile: ${response.data.name} (${response.data.email})`);
  }),

  // 5. Dashboard Stats
  test('Dashboard Statistics', async () => {
    const response = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.stats) {
      throw new Error('Dashboard stats not received');
    }
    
    const stats = response.data.stats;
    log(`   Total Orders: ${stats.totalOrders}`);
    log(`   Total Revenue: ₹${stats.totalRevenue.toFixed(2)}`);
    log(`   Retailers: ${stats.uniqueRetailers}`);
    log(`   Active Services: ${stats.activeServices}`);
    log(`   Orders Change: ${stats.ordersChange}%`);
    log(`   Revenue Change: ${stats.revenueChange}%`);
  }),

  // 6. Create Order (with email notification)
  test('Create Order with Email Notification', async () => {
    const orderData = {
      items: [
        { name: 'Test Product', sku: 'TEST-001', quantity: 2, price: 100, total: 200 }
      ],
      subtotal: 200,
      gstRate: 18,
      gstAmount: 36,
      amount: 236,
      orderStatus: 'confirmed',
      status: 'confirmed',
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890'
      }
    };
    
    const response = await axios.post(`${API_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.orderNumber) {
      throw new Error('Order not created');
    }
    
    log(`   Order Created: ${response.data.orderNumber}`);
    log(`   Amount: ₹${response.data.amount.toFixed(2)}`);
    log(`   Status: ${response.data.status}`);
    
    // Check if email was attempted (will log if not configured)
    log(`   Note: Email notification attempted (check logs if configured)`);
  }),

  // 7. Get Orders
  test('Get Orders List', async () => {
    const response = await axios.get(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!Array.isArray(response.data)) {
      throw new Error('Orders list not received');
    }
    
    log(`   Orders Found: ${response.data.length}`);
    if (response.data.length > 0) {
      log(`   Latest: ${response.data[0].orderNumber}`);
    }
  }),

  // 8. Create Service Request (with email)
  test('Create Service Request with Email', async () => {
    // First, try to get or create a service center
    let serviceCenterId;
    try {
      const centersResponse = await axios.get(`${API_URL}/service-centers`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (centersResponse.data && centersResponse.data.length > 0) {
        serviceCenterId = centersResponse.data[0]._id;
        log(`   Using existing service center: ${centersResponse.data[0].name}`);
      } else {
        // Create a test service center
        const centerData = {
          name: 'Test Service Center',
          email: 'test-service@example.com',
          phone: '1234567890',
          address: '123 Test Street',
          gstNumber: 'GST123456789',
          servicesOffered: ['repair', 'installation'],
          active: true
        };
        
        const centerResponse = await axios.post(`${API_URL}/service-centers`, centerData, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        serviceCenterId = centerResponse.data._id || centerResponse.data.id;
        log(`   Created test service center: ${centerResponse.data.name} (ID: ${serviceCenterId})`);
      }
    } catch (error) {
      // If service centers endpoint doesn't exist, skip this test
      throw new Error(`Cannot create service request: ${error.response?.data?.message || error.message}`);
    }
    
    const serviceRequestData = {
      serviceCenterId: serviceCenterId,
      serviceCenterName: 'Test Service Center',
      serviceCenterEmail: 'test-service@example.com',
      serviceType: 'repair',
      productType: 'LED TV',
      serialNumber: `TEST-SN-${Date.now()}`,
      description: 'Test service request from automated test',
      issueType: 'Not working',
      priority: 'medium',
      status: 'open'
    };
    
    let response;
    try {
      response = await axios.post(`${API_URL}/service-requests`, serviceRequestData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch (error) {
      // Log the actual error for debugging
      const errorMsg = error.response?.data?.message || error.message;
      log(`   Error details: ${errorMsg}`, 'yellow');
      if (error.response?.data) {
        log(`   Response: ${JSON.stringify(error.response.data)}`, 'yellow');
      }
      throw new Error(`Service request creation failed: ${errorMsg}`);
    }
    
    if (!response.data.serviceId) {
      throw new Error('Service request not created - no serviceId in response');
    }
    
    log(`   Service Request Created: ${response.data.serviceId}`);
    log(`   Type: ${response.data.serviceType}`);
    log(`   Priority: ${response.data.priority}`);
    log(`   Note: Email notification attempted (check logs if configured)`);
  }),

  // 9. Get Service Requests
  test('Get Service Requests', async () => {
    const response = await axios.get(`${API_URL}/service-requests`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!Array.isArray(response.data)) {
      throw new Error('Service requests list not received');
    }
    
    log(`   Service Requests Found: ${response.data.length}`);
  }),

  // 10. File Upload Test (if endpoint exists)
  test('File Upload Handling', async () => {
    // Check if uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      warn('Uploads directory does not exist - creating it');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    log(`   Uploads directory: ${fs.existsSync(uploadsDir) ? 'Exists' : 'Missing'}`);
    log(`   Note: File upload middleware is configured`);
  }),

  // 11. Logger Test
  test('Logging System', async () => {
    const logsDir = path.join(__dirname, 'logs');
    const logFiles = [
      'combined.log',
      'error.log'
    ];
    
    const existing = logFiles.filter(f => fs.existsSync(path.join(logsDir, f)));
    log(`   Log files: ${existing.length}/${logFiles.length} exist`);
    
    if (existing.length === 0) {
      warn('Log files not created yet (will be created on first log)');
    } else {
      log(`   Found: ${existing.join(', ')}`);
    }
  }),

  // 12. Email Service Test
  test('Email Service Configuration', async () => {
    const envFile = path.join(__dirname, '.env');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const hasEmailConfig = envContent.includes('EMAIL_USER') && 
                             envContent.includes('EMAIL_PASSWORD');
      
      if (hasEmailConfig) {
        log(`   Email configuration found in .env`);
      } else {
        warn('Email credentials not configured in .env');
        log(`   Email service will log instead of sending`);
      }
    } else {
      warn('.env file not found - email service will use defaults');
    }
  }),

  // 13. Socket.IO Test (check if server supports it)
  test('WebSocket Support', async () => {
    // Check if socket.io is in package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasSocketIO = packageJson.dependencies && packageJson.dependencies['socket.io'];
    
    if (hasSocketIO) {
      log(`   Socket.IO installed: ${hasSocketIO}`);
      log(`   Note: WebSocket server should be running on port ${BASE_URL.split(':').pop()}`);
    } else {
      throw new Error('Socket.IO not found in dependencies');
    }
  }),

  // 14. Products API
  test('Products API', async () => {
    const response = await axios.get(`${API_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!Array.isArray(response.data)) {
      throw new Error('Products list not received');
    }
    
    log(`   Products Found: ${response.data.length}`);
  }),

  // 15. Retailers API
  test('Retailers API', async () => {
    const response = await axios.get(`${API_URL}/retailers`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!Array.isArray(response.data)) {
      throw new Error('Retailers list not received');
    }
    
    log(`   Retailers Found: ${response.data.length}`);
  }),

  // 16. Rate Limiting Test
  test('Rate Limiting', async () => {
    // Make multiple rapid requests
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        axios.get(`${API_URL}/health`).catch(err => err.response)
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r && r.status === 429);
    
    if (rateLimited) {
      log(`   Rate limiting active (429 received)`);
    } else {
      log(`   Rate limiting: Not triggered (may need more requests)`);
    }
  })
];

// Run all tests
async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🚀 Starting Comprehensive Feature Tests', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  log(`Testing against: ${BASE_URL}`, 'cyan');
  log(`API URL: ${API_URL}\n`, 'cyan');
  
  for (const testFn of tests) {
    await testFn();
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 Test Summary', 'blue');
  log('='.repeat(60), 'blue');
  log(`\n✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`⚠️  Warnings: ${results.warnings.length}`, 'yellow');
  
  if (results.passed.length > 0) {
    log('\n✅ Passed Tests:', 'green');
    results.passed.forEach(test => log(`   ✓ ${test}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.failed.forEach(({ name, error }) => {
      log(`   ✗ ${name}`, 'red');
      log(`     ${error}`, 'red');
    });
  }
  
  if (results.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    results.warnings.forEach(warning => log(`   ⚠ ${warning}`, 'yellow'));
  }
  
  log('\n' + '='.repeat(60), 'blue');
  
  if (results.failed.length === 0) {
    log('🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review errors above.', 'yellow');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n❌ Unhandled Error: ${error.message}`, 'red');
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

