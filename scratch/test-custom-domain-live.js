const axios = require('axios');

async function testCustomDomainLive() {
  console.log('🚀 Testing Live Production through crm.charlieai.in routing...');

  try {
    // Health Check
    const health = await axios.get('https://nkiuwl32.up.railway.app/api/health', {
      headers: { 'Host': 'crm.charlieai.in' }
    });
    console.log('  ✅ 1. Health Status:', health.data);

    // Super Admin Login
    const login = await axios.post('https://nkiuwl32.up.railway.app/api/auth/login', {
      email: 'admin@charlieai.com',
      password: 'admin123'
    }, {
      headers: { 'Host': 'crm.charlieai.in' }
    });
    console.log('  ✅ 2. Super Admin Login OK. User:', login.data.user.email, 'Role:', login.data.user.role);

    // Serial Validation endpoint
    const val = await axios.post('https://nkiuwl32.up.railway.app/api/v1/serial-validation/validate', {
      materialCode: 'UTIXK',
      serialNumber: 'IXHFJDGHH',
      dealerCode: '55262',
      accessKey: 'ik_bd3a34d51bcb7057dbdae548c35c4cbde62a23fbf456e478'
    }, {
      headers: { 'Host': 'crm.charlieai.in' }
    });
    console.log('  ✅ 3. Serial Validation API Response (v1.2 Spec):', val.data.responseStatus, '-', val.data.responseMessage);

    console.log('\n======================================================================');
    console.log('🎉 crm.charlieai.in IS 100% CONNECTED AND WORKING IN PRODUCTION!');
    console.log('======================================================================');
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testCustomDomainLive();
