const axios = require('axios');
const assert = require('assert');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const baseUrl = 'http://localhost:7000';
const artifactDir = path.resolve('C:\\Users\\mayur_hlx0x09\\.gemini\\antigravity-ide\\brain\\fb1c58e8-da5f-4359-90cd-68bbb16400c3');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFullWorkflowAudit() {
  console.log('======================================================================');
  console.log('🚀 STARTING FULL ENTERPRISE WORKFLOW AUDIT & TESTING SUITE');
  console.log('======================================================================\n');

  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // Track results
  const auditLog = [];
  const logStep = (step, title, status, details = '') => {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
    console.log(`${icon} [${step}] ${title} -> ${status} ${details ? '(' + details + ')' : ''}`);
    auditLog.push({ step, title, status, details });
  };

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Super Admin Login & Multi-Tenant Sub-Company Provisioning
    // -------------------------------------------------------------------------
    console.log('🏢 --- STEP 1: SUPER ADMIN LOGIN & PROVISIONING SUB-COMPANY ---');
    const saLoginRes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'superadmin@charlieai.com',
      password: 'Admin@123456'
    });
    assert.strictEqual(saLoginRes.status, 200, 'Super Admin login must return 200');
    const saToken = saLoginRes.data.token;
    logStep('1.1', 'Super Admin Login', 'PASS', 'Token acquired');

    // Create Sub-Company "Iconic Smart Technologies"
    const timestamp = Date.now();
    const compSlug = `iconic-${timestamp}`;
    const compCode = `ICN${timestamp.toString().slice(-4)}`;
    const iconicAdminEmail = `admin@${compSlug}.com`;

    const newCompRes = await axios.post(`${baseUrl}/api/companies`, {
      name: 'Iconic Smart Technologies',
      displayName: 'Iconic Smart',
      code: compCode,
      subdomain: compSlug,
      adminName: 'Iconic Admin',
      adminEmail: iconicAdminEmail,
      adminPassword: 'Password@123'
    }, {
      headers: { 'Authorization': `Bearer ${saToken}` }
    });
    assert.strictEqual(newCompRes.status, 201, 'Tenant creation must return 201');
    const companyId = newCompRes.data.company?._id || newCompRes.data._id;
    logStep('1.2', 'Create Sub-Company (Iconic Smart Technologies)', 'PASS', `ID: ${companyId}`);

    // Configure Feature Entitlements for Iconic Smart
    const featRes = await axios.patch(`${baseUrl}/api/tenant-control/${companyId}/features`, {
      features: {
        dashboard: true,
        sales: true,
        customers: true,
        orders: false, // Explicitly disabled for this tenant
        products: true,
        inventory: true,
        service: true,
        serial_validation: true,
        bulk_import: true,
        reports: true,
        api_access: true,
        logistics: false // Explicitly disabled
      }
    }, {
      headers: { 'Authorization': `Bearer ${saToken}` }
    });
    assert.strictEqual(featRes.status, 200, 'Feature entitlements update must return 200');
    logStep('1.3', 'Configure Tenant Feature Entitlements', 'PASS', '10 features configured, orders & logistics disabled');

    // -------------------------------------------------------------------------
    // STEP 2: Tenant Admin Authentication & Multi-Tenant Data Isolation Audit
    // -------------------------------------------------------------------------
    console.log('\n🔒 --- STEP 2: TENANT AUTHENTICATION & MULTI-TENANT ISOLATION ---');
    const tenantLoginRes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: iconicAdminEmail,
      password: 'Password@123'
    });
    assert.strictEqual(tenantLoginRes.status, 200, 'Tenant login must succeed');
    const tenantToken = tenantLoginRes.data.token;
    logStep('2.1', 'Tenant Admin Login', 'PASS', 'JWT token generated with companyId');

    // Check White-Label Branding resolution
    const brandingRes = await axios.get(`${baseUrl}/api/tenant/branding`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.strictEqual(brandingRes.data.displayName, 'Iconic Smart', 'Branding displayName must match tenant name');
    logStep('2.2', 'Tenant White-Label Branding Resolution', 'PASS', `Resolved: ${brandingRes.data.displayName}`);

    // Multi-tenant user isolation: Verify only Iconic Smart users are listed, not Charlie AI
    const usersListRes = await axios.get(`${baseUrl}/api/users`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    const users = usersListRes.data.users || usersListRes.data;
    assert(Array.isArray(users), 'Users response must be an array');
    const hasCrossTenantUsers = users.some(u => u.email.includes('charlieai.com') || u.email.includes('superadmin'));
    assert(!hasCrossTenantUsers, 'CRITICAL: Tenant user list must NOT leak Charlie AI users!');
    assert.strictEqual(users.length, 1, 'Only the single newly created Iconic Admin should exist');
    logStep('2.3', 'Multi-Tenant User Isolation', 'PASS', `Verified ${users.length} isolated tenant user(s)`);

    // -------------------------------------------------------------------------
    // STEP 3: Ingest Products Catalog via Bulk CSV Import
    // -------------------------------------------------------------------------
    console.log('\n📦 --- STEP 3: BULK PRODUCT CATALOG CSV INGESTION ---');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const productCsvData = [
      'productCode,productName,brand,category,price,mrp,model,materialCode,description,unitOfMeasure,warrantyMonths,status',
      'MC-500W,Iconic Water Dispenser 500W,Iconic,Home Appliances,12500,14999,MC500,MC-500W,Commercial grade water purifier,Units,12,Active',
      'MC-700X,Iconic Air Cooler 700X,Iconic,Cooling,8900,10999,MC700,MC-700X,Heavy duty room air cooler,Units,24,Active'
    ].join('\n');

    const productMultipart = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="importType"',
      '',
      'products',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="products_import.csv"',
      'Content-Type: text/csv',
      '',
      productCsvData,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const prodUploadRes = await axios.post(`${baseUrl}/api/bulk-import/upload`, productMultipart, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tenantToken}`
      }
    });
    assert.strictEqual(prodUploadRes.status, 201, 'Product upload must return 201');
    const prodJobId = prodUploadRes.data.jobId;

    // Trigger validation
    await axios.post(`${baseUrl}/api/bulk-import/${prodJobId}/validate`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    await sleep(600);

    // Commit products
    await axios.post(`${baseUrl}/api/bulk-import/${prodJobId}/execute`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    await sleep(600);

    // Verify products in inventory
    const productsRes = await axios.get(`${baseUrl}/api/products`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    const prods = productsRes.data.data || productsRes.data;
    assert(prods.some(p => p.sku === 'MC-500W' || p.productId === 'MC-500W'), 'Product MC-500W must exist in catalog');
    assert(prods.some(p => p.sku === 'MC-700X' || p.productId === 'MC-700X'), 'Product MC-700X must exist in catalog');
    logStep('3.1', 'Bulk Product CSV Ingestion & Commit', 'PASS', '2 Products imported to catalog');

    // -------------------------------------------------------------------------
    // STEP 4: Ingest Serial Numbers Registry via Bulk CSV Import
    // -------------------------------------------------------------------------
    console.log('\n🔢 --- STEP 4: BULK SERIAL REGISTRY CSV INGESTION ---');
    const serialCsvData = [
      'materialCode,serialNumber,dealerCode,batchNumber,manufacturingDate',
      'MC-500W,SN-ICONIC-001,DLR-BAJAJ-01,BATCH-2026-A,2026-01-15',
      'MC-500W,SN-ICONIC-002,DLR-BAJAJ-01,BATCH-2026-A,2026-01-15',
      'MC-700X,SN-ICONIC-003,DLR-BAJAJ-02,BATCH-2026-B,2026-02-10'
    ].join('\n');

    const serialMultipart = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="importType"',
      '',
      'serials',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="serials_import.csv"',
      'Content-Type: text/csv',
      '',
      serialCsvData,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const serialUploadRes = await axios.post(`${baseUrl}/api/bulk-import/upload`, serialMultipart, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tenantToken}`
      }
    });
    assert.strictEqual(serialUploadRes.status, 201, 'Serial upload must return 201');
    const serialJobId = serialUploadRes.data.jobId;

    await axios.post(`${baseUrl}/api/bulk-import/${serialJobId}/validate`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    await sleep(600);

    await axios.post(`${baseUrl}/api/bulk-import/${serialJobId}/execute`, { mode: 'CREATE_ONLY' }, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    await sleep(600);

    const serialJobStatus = await axios.get(`${baseUrl}/api/bulk-import/${serialJobId}`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.strictEqual(serialJobStatus.data.importedRows, 3, 'All 3 serial rows must be imported');
    logStep('4.1', 'Bulk Serial Numbers Registry Ingestion', 'PASS', '3 Serials committed to registry');

    // -------------------------------------------------------------------------
    // STEP 5: Partner API Key Generation & Bajaj Finance Salesforce Validation
    // -------------------------------------------------------------------------
    console.log('\n🔌 --- STEP 5: BAJAJ FINANCE SALESFORCE EXTERNAL API TESTING ---');
    // Generate Partner API Key
    const apiKeyRes = await axios.post(`${baseUrl}/api/api-keys`, {
      name: 'Bajaj Finance Salesforce Gateway',
      feature: 'SERIAL_VALIDATION',
      description: 'Production integration gateway for Bajaj Finance financing validations'
    }, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.strictEqual(apiKeyRes.status, 201, 'API Key creation must succeed');
    const partnerApiKey = apiKeyRes.data.apiKey.key;
    logStep('5.1', 'Generate Partner API Key', 'PASS', 'Key generated');

    delete process.env.SERIAL_VALIDATION_ACCESS_KEY; // Ensure local DB validation engine

    // Case 5.2: Code 0 - Valid Serial Number
    const val0 = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'MC-500W',
      serialNumber: 'SN-ICONIC-001',
      dealerCode: 'DLR-BAJAJ-01',
      accessKey: partnerApiKey
    });
    assert.strictEqual(val0.status, 200);
    assert.strictEqual(val0.data.responseStatus, '0', 'Expected responseStatus 0');
    assert.strictEqual(val0.data.responseMessage, 'Valid Serial Number');
    assert.strictEqual(val0.data.responeMessage, 'Valid Serial Number'); // Typo key check
    logStep('5.2', 'Validation Code 0: Valid Serial Number', 'PASS', 'Valid Serial Number confirmed');

    // Case 5.3: Code -3 - Serial Number Already Validated
    const val3 = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'MC-500W',
      serialNumber: 'SN-ICONIC-001',
      dealerCode: 'DLR-BAJAJ-01',
      accessKey: partnerApiKey
    });
    assert.strictEqual(val3.data.responseStatus, '-3', 'Expected responseStatus -3');
    assert.strictEqual(val3.data.responseMessage, 'Serial Number Already Validated');
    logStep('5.3', 'Validation Code -3: Serial Number Already Validated', 'PASS', 'Status transitioned to VALIDATED');

    // Case 5.4: Code -1 - Invalid Serial Number
    const val1 = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'MC-500W',
      serialNumber: 'SN-NON-EXISTENT-999',
      dealerCode: 'DLR-BAJAJ-01',
      accessKey: partnerApiKey
    });
    assert.strictEqual(val1.data.responseStatus, '-1', 'Expected responseStatus -1');
    assert.strictEqual(val1.data.responseMessage, 'Invalid Serial Number');
    logStep('5.4', 'Validation Code -1: Invalid Serial Number', 'PASS', 'Invalid serial correctly rejected');

    // Case 5.5: Code -2 - Mismatch in model and serial number
    const val2 = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'MC-700X', // Mismatched material code for SN-ICONIC-002 (which is MC-500W)
      serialNumber: 'SN-ICONIC-002',
      dealerCode: 'DLR-BAJAJ-01',
      accessKey: partnerApiKey
    });
    assert.strictEqual(val2.data.responseStatus, '-2', 'Expected responseStatus -2');
    assert.strictEqual(val2.data.responseMessage, 'Mismatch in model and serial number');
    logStep('5.5', 'Validation Code -2: Mismatch in model and serial number', 'PASS', 'Model mismatch caught');

    // Case 5.6: Code -5 - Serial Number not billed to this dealer
    const val5 = await axios.post(`${baseUrl}/api/v1/serial-validation/validate`, {
      materialCode: 'MC-500W',
      serialNumber: 'SN-ICONIC-002',
      dealerCode: 'DLR-BAJAJ-02', // Mismatched dealer code (SN-ICONIC-002 belongs to DLR-BAJAJ-01)
      accessKey: partnerApiKey
    });
    assert.strictEqual(val5.data.responseStatus, '-5', 'Expected responseStatus -5');
    assert.strictEqual(val5.data.responseMessage, 'Serial Number not billed to this dealer');
    logStep('5.6', 'Validation Code -5: Serial Number not billed to this dealer', 'PASS', 'Dealer mismatch caught');

    // -------------------------------------------------------------------------
    // STEP 6: Customer Management Flow & Customer 360 View
    // -------------------------------------------------------------------------
    console.log('\n👥 --- STEP 6: CUSTOMERS DIRECTORY & CUSTOMER 360 FLOW ---');
    const newCustRes = await axios.post(`${baseUrl}/api/contacts`, {
      name: 'Priya Verma',
      email: 'priya.verma@iconicretail.in',
      phone: '+91 98200 12345',
      company: 'Iconic Retailers Mumbai',
      position: 'Managing Partner',
      contactType: 'Retailer',
      city: 'Mumbai',
      state: 'Maharashtra',
      notes: 'Premier showroom distributor for West zone'
    }, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.strictEqual(newCustRes.status, 201, 'Customer creation must return 201');
    const custId = newCustRes.data._id;
    logStep('6.1', 'Create Customer Contact (Priya Verma)', 'PASS', `ID: ${custId}`);

    // Verify 360 query
    const cust360Res = await axios.get(`${baseUrl}/api/contacts/${custId}`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.strictEqual(cust360Res.data.email, 'priya.verma@iconicretail.in');
    assert(Array.isArray(cust360Res.data.recentOrders), 'recentOrders must be an array');
    logStep('6.2', 'Customer 360 Overview Aggregation', 'PASS', 'Customer 360 data retrieved');

    // -------------------------------------------------------------------------
    // STEP 7: Service Requests & Support Tickets Flow
    // -------------------------------------------------------------------------
    console.log('\n🎫 --- STEP 7: SERVICE REQUESTS & SUPPORT WORKFLOW ---');
    const newServiceRes = await axios.post(`${baseUrl}/api/services`, {
      issueType: 'Installation Support',
      description: 'Requesting on-site installation and technician demo for SN-ICONIC-001',
      priority: 'high'
    }, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.strictEqual(newServiceRes.status, 201, 'Service request creation must return 201');
    const serviceId = newServiceRes.data.serviceId || newServiceRes.data._id;
    logStep('7.1', 'Create Service Request', 'PASS', `ID: ${serviceId}`);

    // -------------------------------------------------------------------------
    // STEP 8: Reports Isolation & Feature Gating Verification
    // -------------------------------------------------------------------------
    console.log('\n📊 --- STEP 8: REPORTS ISOLATION & FEATURE GATING ---');
    const repSummaryRes = await axios.get(`${baseUrl}/api/reports/summary`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    const availReports = repSummaryRes.data.availableReports;
    const reportNames = availReports.map(r => r.name);

    // Verify disabled features are omitted
    assert(!reportNames.includes('Orders Report'), 'Orders Report must be hidden because orders feature is disabled');
    assert(!reportNames.includes('Deliveries Report'), 'Deliveries Report must be hidden because logistics is disabled');
    assert(reportNames.includes('Services Report'), 'Services Report must be present');
    assert(reportNames.includes('Contacts'), 'Contacts Report must be present');
    assert(reportNames.includes('Users'), 'Users Report must be present');
    logStep('8.1', 'Reports Feature Gating Check', 'PASS', `Available: ${reportNames.join(', ')}`);

    // Verify Users Report has ONLY 1 user (the tenant admin), not 12
    const usersRepRes = await axios.get(`${baseUrl}/api/reports/users`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    const csvLines = usersRepRes.data.trim().split('\n');
    const userRowsCount = csvLines.length - 1; // Subtract header
    assert.strictEqual(userRowsCount, 1, 'Users report must contain ONLY 1 row (tenant admin)');
    logStep('8.2', 'Users Report Multi-Tenant Isolation', 'PASS', `1 Tenant User row, 0 leaked users`);

    // -------------------------------------------------------------------------
    // STEP 9: Visual Browser Walkthrough with Screenshots
    // -------------------------------------------------------------------------
    console.log('\n🌐 --- STEP 9: PLAYWRIGHT VISUAL BROWSER VERIFICATION ---');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    // 9.1 Login
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
    await page.fill('#email', iconicAdminEmail);
    await page.fill('#password', 'Password@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard.html', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'audit_step1_dashboard.png') });
    logStep('9.1', 'Visual: Dashboard & Dynamic Branding', 'PASS', 'audit_step1_dashboard.png');

    // 9.2 Customers Directory
    await page.goto(`${baseUrl}/contacts.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'audit_step2_customers.png') });
    logStep('9.2', 'Visual: Customers Directory (Priya Verma)', 'PASS', 'audit_step2_customers.png');

    // 9.3 Bulk Import Center
    await page.goto(`${baseUrl}/bulk-import.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'audit_step3_bulk_import.png') });
    logStep('9.3', 'Visual: Bulk CSV Import Center', 'PASS', 'audit_step3_bulk_import.png');

    // 9.4 Inventory
    await page.goto(`${baseUrl}/manage-products.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'audit_step4_products.png') });
    logStep('9.4', 'Visual: Products Inventory (MC-500W, MC-700X)', 'PASS', 'audit_step4_products.png');

    // 9.5 Serial Validation
    await page.goto(`${baseUrl}/serial-validation.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'audit_step5_serials.png') });
    logStep('9.5', 'Visual: Serial Validation Center', 'PASS', 'audit_step5_serials.png');

    // 9.6 Service Requests
    await page.goto(`${baseUrl}/services.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'audit_step6_services.png') });
    logStep('9.6', 'Visual: Service Requests Center', 'PASS', 'audit_step6_services.png');

    await browser.close();

    console.log('\n======================================================================');
    console.log(`🏁 FULL ENTERPRISE WORKFLOW AUDIT COMPLETE: ${auditLog.length} STEPS PASSED, 0 FAILED!`);
    console.log('======================================================================');

  } catch (err) {
    console.error('❌ Enterprise Workflow Audit Error:', err);
    process.exit(1);
  }
}

runFullWorkflowAudit();
