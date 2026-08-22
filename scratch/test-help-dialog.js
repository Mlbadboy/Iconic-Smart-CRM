const { chromium } = require('playwright');

async function testHelpDialog() {
  console.log('🧪 Testing Help Dialog on Login Page...\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let dialogMessage = '';
  page.on('dialog', async dialog => {
    dialogMessage = dialog.message();
    console.log('  📢 Dialog Popup Detected:\n', dialogMessage);
    await dialog.accept();
  });

  await page.goto('http://localhost:7000/login.html');
  await page.click('text=Need Help?');

  if (dialogMessage.includes('info@bitbloom.in') && !dialogMessage.includes('+1-555')) {
    console.log('\n✅ PASS: Email is info@bitbloom.in and mobile number has been removed!');
  } else {
    console.log('\n❌ FAIL: Dialog text unexpected:', dialogMessage);
  }

  await browser.close();
}

testHelpDialog().catch(console.error);
