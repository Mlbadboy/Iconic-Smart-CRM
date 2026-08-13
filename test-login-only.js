const axios = require('axios');

// Quick login test to verify security headers don't break login
const BASE_URL = process.env.TEST_URL || 'http://localhost:7000';
const API_URL = `${BASE_URL}/api`;

async function testLogin() {
  console.log('\n🔐 Testing Login with Security Headers...\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}\n`);
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    let health;
    try {
      health = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      console.log('   ✅ Health check passed:', health.data.status);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to server at ${BASE_URL}. Is the server running? Start it with: npm start`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`Connection timeout. Server may be slow to respond.`);
      } else {
        throw new Error(`Health check failed: ${error.message}`);
      }
    }
    
    // Test 2: Login
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@iconic-crm.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.token) {
      console.log('   ✅ Login successful!');
      console.log(`   Token: ${loginResponse.data.token.substring(0, 30)}...`);
      console.log(`   User: ${loginResponse.data.user.name} (${loginResponse.data.user.role})`);
      
      // Test 3: Protected route
      console.log('\n3. Testing protected route...');
      const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${loginResponse.data.token}` }
      });
      
      console.log('   ✅ Protected route accessible');
      console.log(`   Profile: ${profileResponse.data.name} (${profileResponse.data.email})`);
      
      // Test 4: Check security headers
      console.log('\n4. Checking security headers...');
      const htmlResponse = await axios.get(`${BASE_URL}/login.html`, {
        validateStatus: () => true
      });
      
      const headers = htmlResponse.headers;
      const securityHeaders = {
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'content-security-policy': headers['content-security-policy'] ? 'Set' : 'Not set'
      };
      
      console.log('   Security Headers:');
      Object.entries(securityHeaders).forEach(([key, value]) => {
        console.log(`     ${key}: ${value || 'Not set'}`);
      });
      
      console.log('\n✅ All login tests passed! Security headers are working correctly.\n');
      process.exit(0);
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    console.error('\n❌ Login test failed!');
    console.error('   Error:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    
    console.error('\n⚠️  This might indicate security headers are blocking the request.');
    console.error('   Check the security.js configuration.\n');
    process.exit(1);
  }
}

testLogin();

