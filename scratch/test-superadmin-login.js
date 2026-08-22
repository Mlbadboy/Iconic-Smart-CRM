const axios = require('axios');

async function testSuperAdmin() {
  console.log('Testing Super Administrator login...');

  const baseURL = 'https://nkiuwl32.up.railway.app';
  const headers = {
    'Host': 'crm.charlieai.in',
    'Origin': 'https://crm.charlieai.in',
    'Content-Type': 'application/json'
  };

  try {
    const res = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'superadmin@charlieai.com',
      password: 'Admin@123456'
    }, { headers });

    console.log('✅ Super Admin Login OK!');
    console.log('User Name:', res.data.user.name);
    console.log('User Role:', res.data.user.role);
    console.log('Email:', res.data.user.email);
    console.log('Scope:', res.data.user.scopeType);
    console.log('Token Received:', res.data.token ? 'YES' : 'NO');
  } catch (err) {
    console.log('❌ Error:', err.response?.status, err.response?.data || err.message);
  }
}

testSuperAdmin();
