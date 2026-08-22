/**
 * Charlie's CRM — DOM & Client Runtime Feature Visibility Simulation Test
 */
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:7000';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
    throw new Error(msg);
  }
}

async function runDomTest() {
  console.log('🌐 Starting Client DOM & Feature Guard Real-Time Visibility Test...\n');

  try {
    // 1. Super Admin Login
    console.log('🔑 STEP 1: Super Admin Login & Company Setup');
    const saLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@charlieai.com',
      password: 'Admin@123456'
    });
    const saToken = saLogin.data.token;
    assert(Boolean(saToken), 'Super Admin authenticated successfully');

    // 2. Fetch Companies List to get companyId
    const compRes = await axios.get(`${BASE_URL}/api/tenant-control/overview/list`, {
      headers: { 'Authorization': `Bearer ${saToken}` }
    });
    assert(compRes.data.length > 0, 'Companies retrieved from platform');
    const targetComp = compRes.data[0];
    const companyId = targetComp.id || targetComp._id || targetComp.companyId;
    console.log(`  🏢 Target Company: "${targetComp.companyName || targetComp.name}" (${companyId})`);

    // 3. Set All Features to TRUE initially
    console.log('\n⚙️ STEP 2: Super Admin Enables ALL features');
    await axios.patch(`${BASE_URL}/api/tenant-control/${companyId}/features`, {
      features: {
        service: true,
        marketing: true,
        sales: true,
        orders: true,
        inventory: true
      }
    }, { headers: { 'Authorization': `Bearer ${saToken}` } });

    // 4. Simulate Company Login & Load Dashboard DOM
    console.log('\n📱 STEP 3: Company Login & Initial Dashboard DOM Load');
    const compLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@charlieai.com',
      password: 'admin123'
    });
    const compToken = compLogin.data.token;

    // Fetch fresh entitlements
    const entRes1 = await axios.get(`${BASE_URL}/api/tenant/entitlements`, {
      headers: { 'Authorization': `Bearer ${compToken}` }
    });
    const features1 = entRes1.data.features;

    const dashboardHtml = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');

    function applyFeatureVisibility($, features) {
      $('[data-feature]').each((_, el) => {
        const feat = $(el).attr('data-feature');
        if (features[feat] === false) {
          $(el).css('display', 'none');
          $(el).attr('data-hidden-by-guard', 'true');
        } else {
          $(el).removeAttr('data-hidden-by-guard');
          $(el).css('display', '');
        }
      });
    }

    let $ = cheerio.load(dashboardHtml);
    applyFeatureVisibility($, features1);

    const serviceCardBefore = $('[data-feature="service"]');
    const marketingCardBefore = $('[data-feature="marketing"]');
    assert(serviceCardBefore.length > 0 && serviceCardBefore.attr('data-hidden-by-guard') !== 'true', 'Service Requests card is VISIBLE in initial dashboard');
    assert(marketingCardBefore.length > 0 && marketingCardBefore.attr('data-hidden-by-guard') !== 'true', 'Marketing card is VISIBLE in initial dashboard');

    // 5. Super Admin DISABLES Service & Marketing
    console.log('\n⚡ STEP 4: Super Admin Disables Service & Marketing');
    await axios.patch(`${BASE_URL}/api/tenant-control/${companyId}/features`, {
      features: {
        service: false,
        marketing: false
      }
    }, { headers: { 'Authorization': `Bearer ${saToken}` } });

    // 6. Company reloads / refreshes entitlements
    console.log('\n🔄 STEP 5: Company Refreshes / Reloads Workspace');
    const entRes2 = await axios.get(`${BASE_URL}/api/tenant/entitlements?_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${compToken}`, 'Cache-Control': 'no-cache' }
    });
    const features2 = entRes2.data.features;

    applyFeatureVisibility($, features2);

    const serviceCardAfter = $('[data-feature="service"]');
    const marketingCardAfter = $('[data-feature="marketing"]');
    const salesCardAfter = $('[data-feature="sales"]');

    assert(serviceCardAfter.attr('data-hidden-by-guard') === 'true', 'Service Requests card is now HIDDEN (data-hidden-by-guard="true")');
    assert(marketingCardAfter.attr('data-hidden-by-guard') === 'true', 'Marketing card is now HIDDEN (data-hidden-by-guard="true")');
    assert(salesCardAfter.attr('data-hidden-by-guard') !== 'true', 'Sales & Leads card REMAINS VISIBLE');

    // 7. Super Admin RE-ENABLES Service & Marketing
    console.log('\n✨ STEP 6: Super Admin Re-Enables Service & Marketing');
    await axios.patch(`${BASE_URL}/api/tenant-control/${companyId}/features`, {
      features: {
        service: true,
        marketing: true
      }
    }, { headers: { 'Authorization': `Bearer ${saToken}` } });

    // 8. Company reloads again
    const entRes3 = await axios.get(`${BASE_URL}/api/tenant/entitlements?_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${compToken}`, 'Cache-Control': 'no-cache' }
    });
    const features3 = entRes3.data.features;

    applyFeatureVisibility($, features3);

    const serviceCardRestored = $('[data-feature="service"]');
    const marketingCardRestored = $('[data-feature="marketing"]');

    assert(serviceCardRestored.attr('data-hidden-by-guard') !== 'true', 'Service Requests card is RESTORED and VISIBLE');
    assert(marketingCardRestored.attr('data-hidden-by-guard') !== 'true', 'Marketing card is RESTORED and VISIBLE');

    console.log('\n======================================================');
    console.log(`🏁 DOM FEATURE GUARD SIMULATION: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('DOM test error:', err);
    process.exit(1);
  }
}

runDomTest();
