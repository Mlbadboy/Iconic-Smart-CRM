const axios = require('axios');
const assert = require('assert');

const baseUrl = 'http://localhost:7000';

async function testFullValidationLoop() {
  console.log('🧪 Testing Full Validation Loop for IXHFJDGHH / UTIXK / 55262...');

  // 1. Login as Admin
  const adminLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = adminLogin.data.token;
  const companyId = adminLogin.data.user.companyId;
  console.log(`  Admin logged in, companyId: ${companyId}`);

  // 2. Create an API Key with SERIAL_VALIDATION feature
  const apiKeyRes = await axios.post(`${baseUrl}/api/api-keys`, {
    name: 'External Partner Key',
    feature: 'SERIAL_VALIDATION'
  }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const apiKey = apiKeyRes.data.apiKey.key;
  console.log(`  Created API Key: ${apiKey.substring(0, 10)}...`);

  // 3. Upload & Commit Products (2552 / UTIXK / 32INC)
  console.log('\n📦 Step 1: Uploading Product CSV...');
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

  // Poll
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await axios.get(`${baseUrl}/api/bulk-import/${prodJobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.data.status === 'VALIDATED') break;
  }

  await axios.post(`${baseUrl}/api/bulk-import/${prodJobId}/execute`, { mode: 'CREATE_UPDATE' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✅ Product committed to database!');

  // 4. Upload & Commit Serials (IXHFJDGHH / UTIXK / 55262)
  console.log('\n🔢 Step 2: Uploading Serial CSV...');
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

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await axios.get(`${baseUrl}/api/bulk-import/${serialJobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.data.status === 'VALIDATED') break;
  }

  await axios.post(`${baseUrl}/api/bulk-import/${serialJobId}/execute`, { mode: 'CREATE_UPDATE' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✅ Serial committed to database!');

  // 5. Test Validation via Header X-API-Key
  console.log('\n🔌 Step 3: Validating via X-API-Key header...');
  const res1 = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262'
  }, {
    headers: { 'X-API-Key': apiKey }
  });

  console.log('  Response 1 (Header X-API-Key):', res1.data);
  assert.strictEqual(res1.data.responseStatus, '0', 'Validation must return 0');
  assert.strictEqual(res1.data.valid, true, 'valid must be true');
  assert.strictEqual(res1.data.responseMessage, 'Valid Serial Number');

  // 6. Test Re-Validation (Already Validated)
  console.log('\n🔌 Step 4: Re-Validating (expecting -3 Already Validated)...');
  const res2 = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262',
    accessKey: apiKey
  });

  console.log('  Response 2 (Already Validated):', res2.data);
  assert.strictEqual(res2.data.responseStatus, '-3', 'Re-validation must return -3');
  assert.strictEqual(res2.data.responseMessage, 'Serial Number Already Validated');

  console.log('\n======================================================================');
  console.log('🎉 END-TO-END VALIDATION VERIFIED SUCCESSFULLY!');
  console.log('======================================================================');
}

testFullValidationLoop().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err);
  process.exit(1);
});
