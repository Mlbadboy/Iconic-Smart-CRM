const axios = require('axios');
const baseUrl = 'http://localhost:7000';
const userApiKey = 'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290';

async function setupAndValidate() {
  console.log('1. Logging in as Admin...');
  const login = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = login.data.token;

  console.log('2. Uploading and Committing Product CSV...');
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
  console.log('   ✓ Products committed!');

  console.log('3. Uploading and Committing Serials CSV...');
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
  console.log('   ✓ Serials committed!');

  console.log('\n4. Calling Validation API with User Key:', userApiKey);
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

  console.log('\n🎉 API Response:');
  console.log(JSON.stringify(valRes.data, null, 2));
}

setupAndValidate().catch(err => {
  console.error('Setup failed:', err.response?.data || err.message);
});
