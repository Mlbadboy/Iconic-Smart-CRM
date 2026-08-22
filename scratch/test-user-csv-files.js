const axios = require('axios');
const assert = require('assert');

const baseUrl = 'http://localhost:7000';

async function testUserCsvUpload() {
  console.log('🧪 Testing User Exact CSV Uploads (UTIXK / 2552 / IXHFJDGHH)...');

  // 1. Super admin login
  const saLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'superadmin@charlieai.com',
    password: 'Admin@123456'
  });
  const saToken = saLogin.data.token;

  // 2. Create dedicated sub-company
  const timestamp = Date.now();
  const compSlug = `user-test-${timestamp}`;
  const compCode = `UT${timestamp.toString().slice(-4)}`;
  const userAdminEmail = `admin@${compSlug}.com`;

  const newComp = await axios.post(`${baseUrl}/api/companies`, {
    name: 'User CSV Test Company',
    displayName: 'User Test Co',
    code: compCode,
    subdomain: compSlug,
    adminName: 'User Admin',
    adminEmail: userAdminEmail,
    adminPassword: 'Password@123'
  }, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  });
  const companyId = newComp.data.company?._id || newComp.data._id;

  await axios.patch(`${baseUrl}/api/tenant-control/${companyId}/features`, {
    features: {
      bulk_import: true,
      products: true,
      serial_validation: true
    }
  }, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  });

  // 3. Login as tenant admin
  const tenantLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: userAdminEmail,
    password: 'Password@123'
  });
  const token = tenantLogin.data.token;

  // 4. Upload User Product CSV
  console.log('📦 Step 1: Uploading User Product CSV...');
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

  // Validate Products
  await axios.post(`${baseUrl}/api/bulk-import/${prodJobId}/validate`, { mode: 'CREATE_ONLY' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Poll until validated
  let prodJob;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await axios.get(`${baseUrl}/api/bulk-import/${prodJobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.data.status === 'VALIDATED') {
      prodJob = res.data;
      break;
    }
  }

  assert(prodJob, 'Product job must reach VALIDATED state');
  assert.strictEqual(prodJob.validRows, 1, 'Product row must be valid');
  assert.strictEqual(prodJob.errorRows, 0, 'Product row must have 0 errors');

  // Execute Products
  await axios.post(`${baseUrl}/api/bulk-import/${prodJobId}/execute`, { mode: 'CREATE_ONLY' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 500));
  console.log('✅ Product 2552 / UTIXK imported successfully!');

  // 5. Upload User Serial Numbers CSV
  console.log('\n🔢 Step 2: Uploading User Serial CSV with materialCode UTIXK...');
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

  // Validate Serials
  await axios.post(`${baseUrl}/api/bulk-import/${serialJobId}/validate`, { mode: 'CREATE_ONLY' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Poll until validated
  let serialJob;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await axios.get(`${baseUrl}/api/bulk-import/${serialJobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.data.status === 'VALIDATED') {
      serialJob = res.data;
      break;
    }
  }

  console.log('  Validation Result:', {
    validRows: serialJob?.validRows,
    errorRows: serialJob?.errorRows,
    sampleErrors: serialJob?.sampleErrors
  });

  assert(serialJob, 'Serial job must reach VALIDATED state');
  assert.strictEqual(serialJob.validRows, 1, 'Serial row with UTIXK must be VALID');
  assert.strictEqual(serialJob.errorRows, 0, 'Serial row must have 0 errors');

  // Execute Serials
  await axios.post(`${baseUrl}/api/bulk-import/${serialJobId}/execute`, { mode: 'CREATE_ONLY' }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await new Promise(r => setTimeout(r, 500));
  console.log('✅ Serial IXHFJDGHH with materialCode UTIXK imported successfully!');

  // 6. Test External Validation for this user serial
  console.log('\n🔌 Step 3: Validating Serial IXHFJDGHH via Partner API...');
  const keyRes = await axios.post(`${baseUrl}/api/api-keys`, {
    name: 'User Gateway',
    feature: 'SERIAL_VALIDATION'
  }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const key = keyRes.data.apiKey.key;

  const valRes = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
    materialCode: 'UTIXK',
    serialNumber: 'IXHFJDGHH',
    dealerCode: '55262',
    accessKey: key
  });

  console.log('  Validation API response:', valRes.data);
  assert.strictEqual(valRes.data.responseStatus, '0', 'Validation must return responseStatus 0');
  assert.strictEqual(valRes.data.responseMessage, 'Valid Serial Number');

  console.log('\n======================================================================');
  console.log('🎉 USER CSV TEST PASSED COMPLETELY! 0 ERRORS!');
  console.log('======================================================================');
}

testUserCsvUpload().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err);
  process.exit(1);
});
