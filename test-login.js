const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔍 Testing login endpoint...\n');
    
    const response = await axios.post('http://localhost:7000/api/auth/login', {
      email: 'admin@iconic-crm.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('Token:', response.data.token ? 'Received' : 'Not received');
    console.log('User:', response.data.user?.name);
    console.log('Role:', response.data.user?.role);
    
  } catch (error) {
    console.error('❌ Login failed!');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message || error.message);
  }
}

testLogin();
