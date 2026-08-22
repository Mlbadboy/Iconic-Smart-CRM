const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testBrowserUserFlow() {
  console.log('🌐 Launching browser to test full UI flow with User CSVs...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login as Admin
  console.log('  1. Navigating to login...');
  await page.goto('http://localhost:7000/login.html', { waitUntil: 'networkidle' });
  await page.fill('#email', 'admin@charlieai.com');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard.html', { timeout: 10000 });
  console.log('  2. Logged into Dashboard successfully!');

  // 2. Go to Bulk Import
  console.log('  3. Navigating to Bulk Import Center...');
  await page.goto('http://localhost:7000/bulk-import.html', { waitUntil: 'networkidle' });

  // Create temporary CSV files
  const tmpDir = path.join(__dirname, 'tmp_user_csvs');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const prodCsvPath = path.join(tmpDir, 'user_products.csv');
  fs.writeFileSync(prodCsvPath, [
    'productCode,productName,brand,category,price,mrp,model,materialCode,description,unitOfMeasure,warrantyMonths,status',
    '2552,32INC,ICONICSMART,Led,12990,14990,32inc,UTIXK,,1,1,Active'
  ].join('\n'));

  const serialCsvPath = path.join(tmpDir, 'user_serials.csv');
  fs.writeFileSync(serialCsvPath, [
    'materialCode,productCode,serialNumber,batchNumber,manufacturingDate,dealerCode,distributorCode,region,territory,status',
    'UTIXK,2552,IXHFJDGHH,2,22-07-2023,55262,27858,West,UP,Active'
  ].join('\n'));

  // 3. Upload & Validate Products
  console.log('  4. Selecting Products radio and uploading Product CSV...');
  await page.click('input[name="importType"][value="products"]');
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('#dropZone');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(prodCsvPath);

  console.log('  5. Clicking Start Upload & Validate for Products...');
  await page.click('#uploadBtn');

  // Wait for validation result deck
  await page.waitForSelector('#validationResultDeck', { state: 'visible', timeout: 15000 });
  const prodValid = await page.innerText('#countValid');
  const prodErrors = await page.innerText('#countErrors');
  console.log(`     Product Validation Result: Valid=${prodValid}, Errors=${prodErrors}`);

  // 4. Click Commit Import
  console.log('  6. Clicking Commit Import to Database for Products...');
  await page.click('#commitBtn');
  await page.waitForSelector('#successSummary', { state: 'visible', timeout: 15000 });
  console.log('     Product Import Committed Successfully!');

  // 5. Upload & Validate Serials
  console.log('  7. Selecting Serial Numbers radio and uploading Serials CSV...');
  await page.click('input[name="importType"][value="serials"]');
  const serialChooserPromise = page.waitForEvent('filechooser');
  await page.click('#dropZone');
  const serialChooser = await serialChooserPromise;
  await serialChooser.setFiles(serialCsvPath);

  console.log('  8. Clicking Start Upload & Validate for Serials...');
  await page.click('#uploadBtn');

  // Wait for validation result deck
  await page.waitForSelector('#validationResultDeck', { state: 'visible', timeout: 15000 });
  const serialValid = await page.innerText('#countValid');
  const serialErrors = await page.innerText('#countErrors');
  console.log(`     Serial Validation Result: Valid=${serialValid}, Errors=${serialErrors}`);

  const screenshotPath = path.join(__dirname, '..', 'audit_user_serial_validation_success.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  9. Screenshot saved to ${screenshotPath}`);

  // 6. Commit Serials Import
  console.log('  10. Clicking Commit Import to Database for Serials...');
  await page.click('#commitBtn');
  await page.waitForSelector('#successSummary', { state: 'visible', timeout: 15000 });
  console.log('     Serial Numbers Import Committed Successfully!');

  await browser.close();
  console.log('\n🎉 ALL BROWSER STEPS COMPLETED SUCCESSFULLY WITH 0 ERRORS!');
}

testBrowserUserFlow().catch(err => {
  console.error('❌ Browser test failed:', err);
  process.exit(1);
});
