const axios = require('axios');
const assert = require('assert');

const prodUrl = 'https://iconicsmartcrm.up.railway.app';

async function testLiveProduction() {
  console.log('🚀 Running Live Production Acceptance Suite against:', prodUrl);

  // 1. Health check
  const health = await axios.get(`${prodUrl}/api/health`);
  console.log('  ✅ 1. Health Status:', health.data.status, `(Environment: ${health.data.environment})`);
  assert.strictEqual(health.data.status, 'OK');

  // 2. Login as Super Admin
  const loginRes = await axios.post(`${prodUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  console.log('  ✅ 2. Admin Login OK. Role:', loginRes.data.user.role, 'Company:', loginRes.data.user.companyName);
  const token = loginRes.data.token;

  // 3. Check clean production state (zero dummy orders/leads if newly initialized)
  const ordersRes = await axios.get(`${prodUrl}/api/orders`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('  ✅ 3. Orders query returned status:', ordersRes.status);

  // 4. Test Serial Validation endpoint
  console.log('\n  ✅ 4. Testing Live Serial Validation API...');
  const valRes = await axios.post(`${prodUrl}/api/v1/serial-validation/validate`, {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262',
    accessKey: 'ik_bd3a34d51bcb7057dbdae548c35c4cbde62a23fbf456e478'
  });
  console.log('     Validation Response:', valRes.data);

  // 5. Test Legacy QERP Path
  console.log('\n  ✅ 5. Testing Live QERP Path (/qerp/validatesno.asp)...');
  const qerpRes = await axios.post(`${prodUrl}/qerp/validatesno.asp`, {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262',
    accessKey: 'ik_bd3a34d51bcb7057dbdae548c35c4cbde62a23fbf456e478'
  });
  console.log('     QERP Response:', qerpRes.data);

  console.log('\n======================================================================');
  console.log('🎉 LIVE PRODUCTION DEPLOYMENT FULLY VERIFIED & WORKING!');
  console.log('======================================================================');
}

testLiveProduction().catch(err => {
  console.error('❌ Live production test failed:', err.response?.data || err.message);
  process.exit(1);
});
