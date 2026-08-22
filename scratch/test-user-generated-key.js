const axios = require('axios');

const baseUrl = 'http://localhost:7000';
const userApiKey = 'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290';

async function testUserGeneratedKey() {
  console.log('🧪 Testing User Generated API Key:', userApiKey);

  const payload = {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262'
  };

  try {
    const res = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, payload, {
      headers: {
        'X-API-Key': userApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Validation API Response Status:', res.status);
    console.log('📦 Response Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Request failed:', err.response?.data || err.message);
  }
}

testUserGeneratedKey();
