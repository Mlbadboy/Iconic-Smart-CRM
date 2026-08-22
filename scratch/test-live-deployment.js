const axios = require('axios');

async function checkLiveDeployment() {
  const domains = [
    'https://charlieai.in',
    'https://iconicsmartcrm.up.railway.app'
  ];

  console.log('🔍 Checking Live Deployment across domains...');

  for (const domain of domains) {
    console.log(`\nTesting ${domain}...`);
    try {
      const res = await axios.get(`${domain}/api/health`, { timeout: 10000 });
      console.log(`  ✅ Health check passed: ${res.status}`, res.data);
    } catch (err) {
      console.log(`  ⏳ Domain response:`, err.message || err.response?.status);
    }
  }
}

checkLiveDeployment();
