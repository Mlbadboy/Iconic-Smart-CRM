const axios = require('axios');

async function testLiveAuth() {
  console.log('Testing live auth endpoint...');
  try {
    const res = await axios.post('https://charlieaicrm.up.railway.app/api/auth/login', {
      email: 'admin@charlieai.com',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.log('Error Status:', err.response?.status);
    console.log('Error Data:', err.response?.data);
  }
}

testLiveAuth();
