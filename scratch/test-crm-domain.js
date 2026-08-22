const axios = require('axios');
const dns = require('dns').promises;

async function checkCrmDomain() {
  console.log('🔍 Checking DNS & HTTP for crm.charlieai.in...');

  try {
    const cnameRecords = await dns.resolveCname('crm.charlieai.in');
    console.log('  ✅ DNS CNAME resolved:', cnameRecords);
  } catch (err) {
    console.log('  ⏳ DNS CNAME lookup:', err.message);
  }

  try {
    const res = await axios.get('https://crm.charlieai.in/api/health', { timeout: 8000 });
    console.log('  ✅ HTTP Health Check passed on crm.charlieai.in:', res.data);
  } catch (err) {
    console.log('  ℹ️ HTTP response on crm.charlieai.in:', err.response?.status || err.message);
  }
}

checkCrmDomain();
