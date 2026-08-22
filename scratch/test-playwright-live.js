const { chromium } = require('playwright');
const path = require('path');

async function testInternalBrowser() {
  console.log('🌐 Launching Chromium browser to check live domains...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  // Test 1: Direct Railway URL
  console.log('1. Testing https://iconicsmartcrm.up.railway.app/login.html...');
  try {
    const res1 = await page.goto('https://iconicsmartcrm.up.railway.app/login.html', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    console.log(`   ✅ Direct Railway URL Loaded! Status: ${res1.status()}`);
    const title1 = await page.title();
    console.log(`   Page Title: "${title1}"`);
    const scPath1 = path.join(__dirname, '..', 'live_railway_login.png');
    await page.screenshot({ path: scPath1, fullPage: true });
    console.log(`   📸 Screenshot saved: ${scPath1}`);
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}`);
  }

  // Test 2: Custom domain crm.charlieai.in
  console.log('\n2. Testing https://crm.charlieai.in/login.html...');
  try {
    const res2 = await page.goto('https://crm.charlieai.in/login.html', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    console.log(`   ✅ Custom Domain Loaded! Status: ${res2.status()}`);
    const title2 = await page.title();
    console.log(`   Page Title: "${title2}"`);
    const scPath2 = path.join(__dirname, '..', 'live_custom_domain_login.png');
    await page.screenshot({ path: scPath2, fullPage: true });
    console.log(`   📸 Screenshot saved: ${scPath2}`);
  } catch (err) {
    console.log(`   ⏳ Custom Domain Error: ${err.message}`);
  }

  await browser.close();
  console.log('\n✨ Browser inspection completed.');
}

testInternalBrowser().catch(console.error);
