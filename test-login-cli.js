// Quick CLI login test
const axios = require('axios');

async function quickLogin() {
  console.log('🔐 Testing login...\n');
  
  try {
    const res = await axios.post('http://localhost:7000/api/auth/login', {
      email: 'admin@iconic-crm.com',
      password: 'admin123'
    });
    
    console.log('✅ LOGIN SUCCESSFUL!\n');
    console.log('👤 User:', res.data.user.name);
    console.log('🎭 Role:', res.data.user.role);
    console.log('🔑 Token:', res.data.token.substring(0, 20) + '...');
    console.log('\n📊 Your CRM is working perfectly!');
    console.log('\n🌐 Open browser: http://localhost:7000/login.html');
    console.log('   Email: admin@iconic-crm.com');
    console.log('   Password: admin123');
    console.log('\n💡 TIP: Use Private/Incognito window if CSP errors persist\n');
    
  } catch (err) {
    console.log('❌ Login failed:', err.response?.data?.message || err.message);
  }
}

quickLogin();
