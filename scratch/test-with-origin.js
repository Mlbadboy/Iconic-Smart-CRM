const axios = require('axios');

async function testWithOrigin() {
  console.log('Testing with Origin header...');
  try {
    const res = await axios.post('https://charlieaicrm.up.railway.app/api/auth/login', {
      email: 'admin@charlieai.com',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://charlieaicrm.up.railway.app'
      }
    });
    console.log('✅ Response with Origin:', res.status, res.data.user.email);
  } catch (err) {
    console.log('❌ Error with Origin:', err.response?.status, err.response?.data);
  }
}

testWithOrigin();
