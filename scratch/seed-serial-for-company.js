const axios = require('axios');
const baseUrl = 'http://localhost:7000';
const userApiKey = 'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290';

async function seedAndTest() {
  const login = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = login.data.token;

  // Upload Product
  const prodCsv = [
    'productCode,productName,brand,category,price,mrp,model,materialCode,description,unitOfMeasure,warrantyMonths,status',
    '2552,32INC,ICONICSMART,Led,12990,14990,32inc,UTIXK,,1,1,Active'
  ].join('\n');

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const prodMultipart = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="importType"',
    '',
    'products',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="products.csv"',
    'Content-Type: text/csv',
    '',
    prodCsv,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const prodUpload = await axios.post(`${baseUrl}/api/bulk-import/upload`, prodMultipart, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`
    }
  });
  const prodJobId = prodUpload.data.jobId;

  await axios.post(`${baseUrl}/api/bulk-import/${prodJobId}/validate`, { mode: 'CREATE_UPDATE' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 400));
  await axios.post(`${baseUrl}/api/bulk-import/${prodJobId}/execute`, { mode: 'CREATE_UPDATE' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Product 2552 / UTIXK committed to database.');

  // Upload Serial
  const serialCsv = [
    'materialCode,productCode,serialNumber,batchNumber,manufacturingDate,dealerCode,distributorCode,region,territory,status',
    'UTIXK,2552,IXHFJDGHH,2,22-07-2023,55262,27858,West,UP,Active'
  ].join('\n');

  const serialMultipart = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="importType"',
    '',
    'serials',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="serials.csv"',
    'Content-Type: text/csv',
    '',
    serialCsv,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const serialUpload = await axios.post(`${baseUrl}/api/bulk-import/upload`, serialMultipart, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`
    }
  });
  const serialJobId = serialUpload.data.jobId;

  await axios.post(`${baseUrl}/api/bulk-import/${serialJobId}/validate`, { mode: 'CREATE_UPDATE' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 400));
  await axios.post(`${baseUrl}/api/bulk-import/${serialJobId}/execute`, { mode: 'CREATE_UPDATE' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Serial IXHFJDGHH committed to registry.');

  console.log('\n🚀 Testing Partner Validation Call with your API Key...');
  const valRes = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262'
  }, {
    headers: {
      'X-API-Key': userApiKey,
      'Content-Type': 'application/json'
    }
  });

  console.log('Status Code:', valRes.status);
  console.log('Response Payload:', JSON.stringify(valRes.data, null, 2));
}

seedAndTest().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});
