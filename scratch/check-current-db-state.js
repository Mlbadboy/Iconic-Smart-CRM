const axios = require('axios');
const baseUrl = 'http://localhost:7000';

async function checkDb() {
  console.log('🔍 Checking live CRM database state...');

  // Super admin login
  const saLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = saLogin.data.token;
  console.log('  Admin User CompanyId:', saLogin.data.user.companyId);

  // Check products under admin company
  const prodRes = await axios.get(`${baseUrl}/api/products`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`  Total Products in catalog for this company: ${prodRes.data.products?.length || prodRes.data.length || 0}`);
  if (Array.isArray(prodRes.data.products)) {
    console.log('  Products in catalog:', prodRes.data.products.map(p => ({
      name: p.name,
      sku: p.sku,
      materialCode: p.materialCode,
      productCode: p.productCode,
      model: p.model
    })));
  } else if (Array.isArray(prodRes.data)) {
    console.log('  Products in catalog:', prodRes.data.map(p => ({
      name: p.name,
      sku: p.sku,
      materialCode: p.materialCode,
      productCode: p.productCode,
      model: p.model
    })));
  }

  // Check recent bulk import jobs
  const jobsRes = await axios.get(`${baseUrl}/api/bulk-import`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`  Recent Bulk Import Jobs: ${jobsRes.data.jobs?.length || jobsRes.data.length || 0}`);
  const jobs = jobsRes.data.jobs || jobsRes.data || [];
  jobs.slice(0, 5).forEach(j => {
    console.log(`    - Job ${j.jobId} (${j.importType}): status=${j.status}, total=${j.totalRows}, valid=${j.validRows}, errors=${j.errorRows}, imported=${j.importedRows}`);
  });
}

checkDb().catch(err => {
  console.error('Check failed:', err.response?.data || err);
});
