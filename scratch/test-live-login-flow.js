const { chromium } = require('playwright');
const path = require('path');

async function testLiveLogin() {
  console.log('🧪 Testing Live Login on https://charlieaicrm.up.railway.app/login.html...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Listen for console logs and errors
  page.on('console', msg => console.log('  [Browser Log]', msg.text()));
  page.on('pageerror', err => console.log('  [Browser Error]', err.message));

  console.log('1. Navigating to login page...');
  await page.goto('https://charlieaicrm.up.railway.app/login.html', { waitUntil: 'networkidle' });

  console.log('2. Filling in credentials...');
  await page.fill('#email', 'admin@charlieai.com');
  await page.fill('#password', 'admin123');

  console.log('3. Clicking Login button...');
  await page.click('button[type="submit"]');

  // Wait for navigation or toast
  try {
    await page.waitForURL('**/dashboard.html**', { timeout: 10000 });
    console.log('  🎉 Logged in and navigated to Dashboard!');
    console.log('  Current URL:', page.url());

    await page.waitForTimeout(2000);
    const scPath = path.join(__dirname, '..', 'live_dashboard_success.png');
    await page.screenshot({ path: scPath, fullPage: true });
    console.log(`  📸 Dashboard screenshot saved: ${scPath}`);
  } catch (err) {
    console.log('  Navigation error or alert:', err.message);
    const scPath = path.join(__dirname, '..', 'live_login_debug.png');
    await page.screenshot({ path: scPath, fullPage: true });
    console.log(`  📸 Screenshot saved: ${scPath}`);
  }

  await browser.close();
}

testLiveLogin().catch(console.error);
