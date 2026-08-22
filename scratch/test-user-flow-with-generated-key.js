const axios = require('axios');

const baseUrl = 'http://localhost:7000';
const userApiKey = 'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290';

async function testWithKey() {
  console.log('Testing with API Key:', userApiKey);
  try {
    const res = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'UTIXK',
      serialNumber: 'IXHFJDGHH',
      dealerCode: '55262'
    }, {
      headers: {
        'X-API-Key': userApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testWithKey();
