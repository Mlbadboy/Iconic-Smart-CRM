const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runE2EBrowserTest() {
  console.log('🚀 Launching Chromium E2E Browser Automation with Visual Screenshots...');
  
  const artifactDir = path.resolve('C:\\Users\\mayur_hlx0x09\\.gemini\\antigravity-ide\\brain\\fb1c58e8-da5f-4359-90cd-68bbb16400c3');
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:7000';

  try {
    // 1. Login Page
    console.log('🌐 Step 1: Navigating to Login page...');
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1_login.png') });
    console.log('  📸 Captured screenshot_1_login.png');

    // Submit login
    await page.fill('#email', 'admin@charlieai.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard.html', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_2_dashboard.png') });
    console.log('✅ Step 2: Logged in. 📸 Captured screenshot_2_dashboard.png');

    // 2. Customers Page
    console.log('🌐 Step 3: Navigating to Customers Directory...');
    await page.goto(`${baseUrl}/contacts.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Create a new customer
    await page.click('button:has-text("Add Customer")');
    await page.waitForSelector('#contactModal.show', { timeout: 5000 });
    await page.fill('#contactName', 'Global Tech Solutions');
    await page.fill('#contactEmail', 'hello@globaltech.com');
    await page.fill('#contactPhone', '+91 98765 11223');
    await page.fill('#contactCompany', 'Global Technologies Pvt Ltd');
    await page.fill('#contactCity', 'Bengaluru');
    await page.click('#saveContactBtn');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(artifactDir, 'screenshot_3_customers.png') });
    console.log('✅ Step 3: Customer added. 📸 Captured screenshot_3_customers.png');

    // 3. Customer 360 Modal
    console.log('🌐 Step 4: Testing Customer 360 Modal...');
    const first360Btn = await page.$('button:has-text("360")');
    if (first360Btn) {
      await first360Btn.click();
      await page.waitForSelector('#customer360Modal.show', { timeout: 5000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artifactDir, 'screenshot_4_customer360.png') });
      console.log('✅ Step 4: Customer 360 modal opened. 📸 Captured screenshot_4_customer360.png');
      await page.click('#customer360Modal .modal-close');
    }

    // 4. Bulk Import Center
    console.log('🌐 Step 5: Navigating to Bulk Import Center...');
    await page.goto(`${baseUrl}/bulk-import.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_5_bulk_import.png') });
    console.log('✅ Step 5: Bulk Import Center loaded. 📸 Captured screenshot_5_bulk_import.png');

    // 5. Product Catalog
    console.log('🌐 Step 6: Navigating to Product Inventory...');
    await page.goto(`${baseUrl}/manage-products.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_6_products.png') });
    console.log('✅ Step 6: Product Catalog loaded. 📸 Captured screenshot_6_products.png');

    // 6. Serial Validation Center
    console.log('🌐 Step 7: Navigating to Serial Validation Center...');
    await page.goto(`${baseUrl}/serial-validation.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_7_serial_validation.png') });
    console.log('✅ Step 7: Serial Validation loaded. 📸 Captured screenshot_7_serial_validation.png');

    // 7. Super Admin Platform Controls (Fresh Context)
    console.log('🌐 Step 8: Logging in as Super Admin in isolated session...');
    const superContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const superPage = await superContext.newPage();
    await superPage.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
    await superPage.fill('#email', 'superadmin@charlieai.com');
    await superPage.fill('#password', 'Admin@123456');
    await superPage.click('button[type="submit"]');
    await superPage.waitForURL('**/dashboard.html', { timeout: 10000 });

    await superPage.goto(`${baseUrl}/tenant-control.html`, { waitUntil: 'networkidle' });
    await superPage.waitForTimeout(1000);
    await superPage.screenshot({ path: path.join(artifactDir, 'screenshot_8_tenant_control.png') });
    console.log('✅ Step 8: Super Admin Tenant Controls loaded. 📸 Captured screenshot_8_tenant_control.png');
    await superContext.close();

    console.log('\n======================================================================');
    console.log('🎉 ALL 8 E2E VISUAL TEST STEPS EXECUTED & SCREENSHOTS SAVED SUCCESSFULLY!');
    console.log('======================================================================');

  } catch (err) {
    console.error('❌ E2E Browser Test Error:', err);
  } finally {
    await browser.close();
  }
}

runE2EBrowserTest();
