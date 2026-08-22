const axios = require('axios');
const assert = require('assert');

const baseUrl = 'http://localhost:7000';

async function testAllSpecResponses() {
  console.log('🧪 Testing All 6 PDF Spec Responses (0, -1, -2, -3, -4, -5)...');

  // 1. Admin Login
  const login = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'admin@charlieai.com',
    password: 'admin123'
  });
  const token = login.data.token;

  // 2. Generate API key
  const keyRes = await axios.post(`${baseUrl}/api/api-keys`, {
    name: 'Spec Tester Key',
    feature: 'SERIAL_VALIDATION'
  }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const accessKey = keyRes.data.apiKey.key;

  // 3. Upload & Commit Products
  const prodCsv = [
    'productCode,productName,brand,category,price,mrp,model,materialCode,description,unitOfMeasure,warrantyMonths,status',
    '2552,32INC,ICONICSMART,Led,12990,14990,32inc,UTIXK,,1,1,Active',
    '7700,55INC,ICONICSMART,Led,34990,39990,55inc,MC-55UHD,,1,1,Active'
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

  // 4. Upload & Commit Serials
  const serialCsv = [
    'materialCode,productCode,serialNumber,batchNumber,manufacturingDate,dealerCode,distributorCode,region,territory,status',
    'UTIXK,2552,SN-SPEC-001,1,22-07-2023,55262,27858,West,UP,Active',
    'UTIXK,2552,SN-SPEC-002,1,22-07-2023,55262,27858,West,UP,Active',
    'MC-55UHD,7700,SN-SPEC-003,1,22-07-2023,123456,27858,North,DL,Active'
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

  // Helper validation request function
  async function callValidation(payload, useEndpoint = '/api/v1/serial-validation/validate') {
    return await axios.post(`${baseUrl}${useEndpoint}`, {
      ...payload,
      accessKey
    });
  }

  // -------------------------------------------------------------
  // Test 1: Code 0 - Valid Serial Number
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Code 0: Valid Serial Number ---');
  const res0 = await callValidation({
    materialCode: 'UTIXK',
    serialNumber: 'SN-SPEC-001',
    dealerCode: '55262'
  });
  console.log('Payload:', { materialCode: 'UTIXK', serialNumber: 'SN-SPEC-001', dealerCode: '55262' });
  console.log('Result:', { responseStatus: res0.data.responseStatus, responseMessage: res0.data.responseMessage });
  assert.strictEqual(res0.data.responseStatus, '0');
  assert.strictEqual(res0.data.responseMessage, 'Valid Serial Number');

  // -------------------------------------------------------------
  // Test 2: Code -3 - Serial Number Already Validated
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Code -3: Serial Number Already Validated ---');
  const res3 = await callValidation({
    materialCode: 'UTIXK',
    serialNumber: 'SN-SPEC-001',
    dealerCode: '55262'
  });
  console.log('Result:', { responseStatus: res3.data.responseStatus, responseMessage: res3.data.responseMessage });
  assert.strictEqual(res3.data.responseStatus, '-3');
  assert.strictEqual(res3.data.responseMessage, 'Serial Number Already Validated');

  // -------------------------------------------------------------
  // Test 3: Code -1 - Invalid Serial Number
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Code -1: Invalid Serial Number ---');
  const res1 = await callValidation({
    materialCode: 'UTIXK',
    serialNumber: 'NON-EXISTENT-SN-999',
    dealerCode: '55262'
  });
  console.log('Result:', { responseStatus: res1.data.responseStatus, responseMessage: res1.data.responseMessage });
  assert.strictEqual(res1.data.responseStatus, '-1');
  assert.strictEqual(res1.data.responseMessage, 'Invalid Serial Number');

  // -------------------------------------------------------------
  // Test 4: Code -2 - Mismatch in model and serial number
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Code -2: Mismatch in model and serial number ---');
  const res2 = await callValidation({
    materialCode: 'MC-55UHD',
    serialNumber: 'SN-SPEC-002',
    dealerCode: '55262'
  });
  console.log('Result:', { responseStatus: res2.data.responseStatus, responseMessage: res2.data.responseMessage });
  assert.strictEqual(res2.data.responseStatus, '-2');
  assert.strictEqual(res2.data.responseMessage, 'Mismatch in model and serial number');

  // -------------------------------------------------------------
  // Test 5: Code -4 - Invalid Material code
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing Code -4: Invalid Material code ---');
  try {
    const res4 = await callValidation({
      materialCode: '',
      serialNumber: 'SN-SPEC-002',
      dealerCode: '55262'
    });
    console.log('Result:', { responseStatus: res4.data.responseStatus, responseMessage: res4.data.responseMessage });
    assert.strictEqual(res4.data.responseStatus, '-4');
  } catch (err) {
    console.log('Result:', { responseStatus: err.response?.data?.responseStatus, responseMessage: err.response?.data?.responseMessage });
    assert.strictEqual(err.response?.data?.responseStatus, '-4');
    assert.strictEqual(err.response?.data?.responseMessage, 'Invalid Material code');
  }

  // -------------------------------------------------------------
  // Test 6: Code -5 - Serial Number not billed to this dealer
  // -------------------------------------------------------------
  console.log('\n--- 6. Testing Code -5: Serial Number not billed to this dealer ---');
  const res5 = await callValidation({
    materialCode: 'UTIXK',
    serialNumber: 'SN-SPEC-002',
    dealerCode: 'WRONG-DEALER-999'
  });
  console.log('Result:', { responseStatus: res5.data.responseStatus, responseMessage: res5.data.responseMessage });
  assert.strictEqual(res5.data.responseStatus, '-5');
  assert.strictEqual(res5.data.responseMessage, 'Serial Number not billed to this dealer');

  // -------------------------------------------------------------
  // Test 7: Legacy URL Path (/qerp/validatesno.asp)
  // -------------------------------------------------------------
  console.log('\n--- 7. Testing Legacy Spec Path (/qerp/validatesno.asp) ---');
  const resLegacy = await callValidation({
    materialCode: 'MC-55UHD',
    serialNumber: 'SN-SPEC-003',
    dealerCode: '123456'
  }, '/qerp/validatesno.asp');
  console.log('Result:', { responseStatus: resLegacy.data.responseStatus, responseMessage: resLegacy.data.responseMessage });
  assert.strictEqual(resLegacy.data.responseStatus, '0');
  assert.strictEqual(resLegacy.data.responseMessage, 'Valid Serial Number');

  console.log('\n======================================================================');
  console.log('🎉 ALL 6 SPECIFICATION RESPONSES MATCH 100% ACCURATELY!');
  console.log('======================================================================');
}

testAllSpecResponses().catch(err => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
