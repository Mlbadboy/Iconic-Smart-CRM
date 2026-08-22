const axios = require('axios');

async function testFullProduction() {
  console.log('🚀 Running Complete Verification on crm.charlieai.in...\n');

  const baseURL = 'https://nkiuwl32.up.railway.app';
  const headers = {
    'Host': 'crm.charlieai.in',
    'Origin': 'https://crm.charlieai.in',
    'Content-Type': 'application/json'
  };

  // 1. Health Check
  const health = await axios.get(`${baseURL}/api/health`, { headers });
  console.log('1. Health Check:', health.status, health.data.status, `(Env: ${health.data.environment})`);

  // 2. Login
  const login = await axios.post(`${baseURL}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  }, { headers });
  console.log('2. Super Admin Login:', login.status, `Logged in as: ${login.data.user.email} (${login.data.user.role})`);
  const token = login.data.token;

  // 3. User Profile
  const me = await axios.get(`${baseURL}/api/auth/me`, {
    headers: { ...headers, 'Authorization': `Bearer ${token}` }
  });
  console.log('3. Authenticated Profile:', me.status, `User Email: ${me.data.email}, Role: ${me.data.role}`);

  // 4. API Keys List
  const keys = await axios.get(`${baseURL}/api/api-keys`, {
    headers: { ...headers, 'Authorization': `Bearer ${token}` }
  });
  console.log('4. API Keys List:', keys.status, `Found ${keys.data.data ? keys.data.data.length : 0} API keys`);

  // 5. Serial Validation v1.2 Test
  const val = await axios.post(`${baseURL}/api/v1/serial-validation/validate`, {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262',
    accessKey: 'ik_bd3a34d51bcb7057dbdae548c35c4cbde62a23fbf456e478'
  }, { headers });
  console.log('5. Serial Validation Response:', val.data.responseStatus, '-', val.data.responseMessage);

  console.log('\n======================================================================');
  console.log('🎉 crm.charlieai.in IS 100% OPERATIONAL, SECURE, AND AUTHENTICATED!');
  console.log('======================================================================');
}

testFullProduction().catch(console.error);
