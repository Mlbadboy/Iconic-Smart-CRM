const axios = require('axios');
const baseUrl = 'http://localhost:7000';
const apiKey = 'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290';

async function testApi() {
  console.log('Testing Validation API Call...');
  try {
    const res = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'UTIXK',
      serialNumber: 'IXHFJDGHH',
      dealerCode: '55262'
    }, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Failed:', err.response?.data || err.message);
  }
}

testApi();
