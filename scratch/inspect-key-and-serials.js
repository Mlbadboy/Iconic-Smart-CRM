const axios = require('axios');
const baseUrl = 'http://localhost:7000';

async function inspect() {
  const saLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = saLogin.data.token;

  // Query platform overview of api keys
  const keysRes = await axios.get(`${baseUrl}/api/api-keys`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('🔑 API Keys in DB:', (Array.isArray(keysRes.data) ? keysRes.data : (keysRes.data.apiKeys || [])).map(k => ({
    name: k.name,
    prefix: k.prefix,
    companyId: k.companyId,
    feature: k.feature,
    active: k.active
  })));

  // Query serial registry
  const serialsRes = await axios.get(`${baseUrl}/api/v1/serial-registry`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('🔢 Serials in DB:', (Array.isArray(serialsRes.data) ? serialsRes.data : (serialsRes.data.serials || serialsRes.data.units || [])).map(s => ({
    serialNumber: s.serialNumber,
    materialCode: s.materialCode,
    dealerCode: s.dealerCode,
    status: s.status,
    companyId: s.companyId
  })));
}

inspect().catch(err => {
  console.error('Inspection failed:', err.response?.data || err.message);
});
