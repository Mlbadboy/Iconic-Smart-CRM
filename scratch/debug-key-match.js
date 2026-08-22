const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const userApiKey = 'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290';

async function debugMatch() {
  const axios = require('axios');
  const login = await axios.post('http://localhost:7000/api/auth/login', {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = login.data.token;

  // Let's create an API key under this active login session
  const keyRes = await axios.post('http://localhost:7000/api/api-keys', {
    name: 'Active Session Key',
    feature: 'SERIAL_VALIDATION'
  }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const sessionKey = keyRes.data.apiKey.key;
  console.log('Session Key generated:', sessionKey);

  // Test with sessionKey
  const valRes = await axios.post('http://localhost:7000/api/v1/serial-validation/validate', {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262'
  }, {
    headers: {
      'X-API-Key': sessionKey,
      'Content-Type': 'application/json'
    }
  });

  console.log('Validation with Session Key:', valRes.data);
}

debugMatch().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});
