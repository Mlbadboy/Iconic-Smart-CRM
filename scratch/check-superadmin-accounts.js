const axios = require('axios');

async function testSuperAdminLogins() {
  console.log('🔍 Checking Super Admin login access on https://crm.charlieai.in...\n');

  const baseURL = 'https://nkiuwl32.up.railway.app';
  const headers = {
    'Host': 'crm.charlieai.in',
    'Origin': 'https://crm.charlieai.in',
    'Content-Type': 'application/json'
  };

  const candidates = [
    { email: 'superadmin@charlieai.com', password: 'superadmin123' },
    { email: 'superadmin@charlieai.com', password: 'admin123' },
    { email: 'admin@charlieai.com', password: 'admin123' },
    { email: 'admin@iconicsmart.co.in', password: 'admin123' },
    { email: 'superadmin@iconicsmart.co.in', password: 'admin123' }
  ];

  for (const acc of candidates) {
    try {
      const res = await axios.post(`${baseURL}/api/auth/login`, acc, { headers });
      console.log(`✅ SUCCESS: ${acc.email} | Role: ${res.data.user.role} | Name: ${res.data.user.name}`);
      console.log(`   Scope: ${res.data.user.scopeType}, Company: ${res.data.user.company ? res.data.user.company.name : 'Platform Master'}`);
    } catch (e) {
      console.log(`❌ Failed: ${acc.email} (${e.response?.data?.message || e.message})`);
    }
  }
}

testSuperAdminLogins();
