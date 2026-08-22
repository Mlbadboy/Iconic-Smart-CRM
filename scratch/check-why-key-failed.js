const axios = require('axios');
const baseUrl = 'http://localhost:7000';
const userApiKey = 'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290';

async function diagnose() {
  const login = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = login.data.token;
  console.log('Login User companyId:', login.data.user.companyId);

  // Check all companies
  const compRes = await axios.get(`${baseUrl}/api/companies`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Companies in DB:', compRes.data.map(c => ({ id: c._id, name: c.name, code: c.code })));

  // Check recent validations
  const valHistRes = await axios.get(`${baseUrl}/api/serial-validation/history`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Recent Validations:', valHistRes.data.history?.slice(0, 3));
}

diagnose().catch(err => {
  console.error('Diagnostic error:', err.response?.data || err.message);
});
