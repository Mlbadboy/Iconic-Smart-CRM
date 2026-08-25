const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');
const Product = require('../models/Product');
const MarketingConnection = require('../models/MarketingConnection');
const GoogleMarketingAccount = require('../models/GoogleMarketingAccount');
const AiCreativeConfig = require('../models/AiCreativeConfig');
const UnifiedCampaign = require('../models/UnifiedCampaign');
const OmnichannelSchedule = require('../models/OmnichannelSchedule');

const marketingConnectionService = require('../services/marketingConnectionService');
const googleMarketingService = require('../services/googleMarketingService');
const aiCreativeStudioService = require('../services/aiCreativeStudioService');
const unifiedCampaignEngine = require('../services/unifiedCampaignEngine');
const omnichannelAttributionEngine = require('../services/omnichannelAttributionEngine');

async function runTests() {
  console.log('🚀 Starting Marketing HQ Production Acceptance Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${name}`);
      failed++;
    }
  }

  try {
    // Setup test DB connection
    let mongoServer;
    if (mongoose.connection.readyState === 0) {
      if (process.env.MONGO_URI) {
        await mongoose.connect(process.env.MONGO_URI);
      } else {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-test-'));
        mongoServer = await MongoMemoryServer.create({
          instance: { dbPath: tempDir }
        });
        await mongoose.connect(mongoServer.getUri());
      }
    }

    // 1. Create Test Tenants
    const companyA = await Company.findOneAndUpdate(
      { code: 'MKT_HQ_A' },
      { name: 'Apex Appliances India', code: 'MKT_HQ_A', status: 'ACTIVE' },
      { upsert: true, new: true }
    );
    const companyB = await Company.findOneAndUpdate(
      { code: 'MKT_HQ_B' },
      { name: 'Zenith Retail Corp', code: 'MKT_HQ_B', status: 'ACTIVE' },
      { upsert: true, new: true }
    );
    const userA = await User.findOneAndUpdate(
      { email: 'admin@apexappliances.in' },
      { name: 'Apex Admin', email: 'admin@apexappliances.in', companyId: companyA._id, role: 'COMPANY_ADMIN' },
      { upsert: true, new: true }
    );

    // ==========================================
    // TEST SUITE 1: ACCOUNT CONNECTION CENTER
    // ==========================================
    console.log('📦 TEST SUITE 1: Account Connection Center & Tenant Isolation');
    
    // Connect 6 Providers for Company A
    await marketingConnectionService.connectProvider(companyA._id, userA._id, 'WHATSAPP_BUSINESS', {
      displayName: 'Apex Official WABA',
      accountId: 'WABA-902819',
      tokenOrKey: 'EAABx_test_waba_secret_token_123'
    });
    await marketingConnectionService.connectProvider(companyA._id, userA._id, 'META_FACEBOOK', {
      displayName: 'Apex Appliances Official Page',
      accountId: 'PAGE-102938',
      tokenOrKey: 'EAABx_test_fb_page_token_456'
    });
    await marketingConnectionService.connectProvider(companyA._id, userA._id, 'META_INSTAGRAM', {
      displayName: '@apex_appliances_official',
      accountId: 'IG-592019'
    });
    await marketingConnectionService.connectProvider(companyA._id, userA._id, 'META_ADS', {
      displayName: 'Apex Primary Ad Account',
      accountId: 'ACT-991029'
    });
    await marketingConnectionService.connectProvider(companyA._id, userA._id, 'GOOGLE_ADS', {
      displayName: 'Apex Google Ads Enterprise',
      accountId: '849-291-4920'
    });
    await marketingConnectionService.connectProvider(companyA._id, userA._id, 'GOOGLE_MERCHANT', {
      displayName: 'Apex Merchant Center Feed',
      accountId: 'MC-910283'
    });

    const connA = await marketingConnectionService.getTenantConnections(companyA._id);
    const wabaA = connA.find(c => c.provider === 'WHATSAPP_BUSINESS');
    assert(wabaA.status === 'CONNECTED' && wabaA.displayName === 'Apex Official WABA', 'Company A WhatsApp Business connection active');
    
    const fbA = connA.find(c => c.provider === 'META_FACEBOOK');
    assert(fbA.status === 'CONNECTED' && fbA.accountId === 'PAGE-102938', 'Company A Facebook connection active');

    // Tenant Isolation Check: Company B must see all disconnected
    const connB = await marketingConnectionService.getTenantConnections(companyB._id);
    const wabaB = connB.find(c => c.provider === 'WHATSAPP_BUSINESS');
    assert(wabaB.status === 'DISCONNECTED', 'Tenant Isolation: Company B sees WhatsApp DISCONNECTED');

    // Diagnostics Test
    const diag = await marketingConnectionService.runDiagnostic(companyA._id, 'WHATSAPP_BUSINESS');
    assert(diag.canTransmit === true && diag.checks.length === 4, 'WhatsApp self-healing diagnostic returns 4 passed checks');

    // ==========================================
    // TEST SUITE 2: GOOGLE MARKETING ECOSYSTEM
    // ==========================================
    console.log('\n📦 TEST SUITE 2: Google Marketing Ecosystem & Merchant Center Sync');
    
    // Seed test products
    await Product.create([
      { companyId: companyA._id, name: 'Apex Solar Water Heater 200L', productId: 'PROD-001', sku: 'SKU-001', price: 24999, image: 'https://images.unsplash.com/photo-1' },
      { companyId: companyA._id, name: 'Apex Smart Digital Thermostat', productId: 'PROD-002', sku: 'SKU-002', price: 3499, image: 'https://images.unsplash.com/photo-2' }
    ]);

    const googleAcc = await googleMarketingService.getAccount(companyA._id);
    assert(googleAcc.customerId === '849-291-4920', 'Google Marketing Account initialized');
    assert(googleAcc.businessProfile.rating === 4.9, 'Google Business Profile rating active (4.9⭐)');

    const merchantSync = await googleMarketingService.syncMerchantFeed(companyA._id);
    assert(merchantSync.feedStatus === 'ACTIVE' && merchantSync.approvedProducts > 0, 'Google Merchant Center feed sync audit completed successfully');

    // ==========================================
    // TEST SUITE 3: AI CREATIVE STUDIO & PROMPT GOVERNANCE
    // ==========================================
    console.log('\n📦 TEST SUITE 3: AI Creative Studio (5-Tier Prompt Hierarchy & BYOK)');
    
    // Update Brand Profile
    const aiConfig = await aiCreativeStudioService.updateConfig(companyA._id, {
      mode: 'PLATFORM',
      brandProfile: {
        brandName: 'Apex Appliances India',
        brandTone: 'PREMIUM',
        targetAudience: 'Indian homeowners seeking energy efficiency'
      }
    });
    assert(aiConfig.brandProfile.brandName === 'Apex Appliances India', 'Brand Profile configured with custom tone and audience');

    // Generate Creative
    const creative = await aiCreativeStudioService.generateCreative(companyA._id, userA._id, {
      prompt: 'Promote our high-efficiency water heaters with Diwali festival discount',
      targetFestival: 'Diwali Grand Festival',
      productName: 'Apex 5-Star Solar Water Heater'
    });

    assert(creative.channelCopies.whatsAppShort.includes('Exclusive Offer'), 'WhatsApp short copy generated with festival hook');
    assert(creative.channelCopies.instagramCaption.includes('#ApexAppliancesIndia'), 'Instagram caption generated with custom brand hashtags');
    assert(creative.channelCopies.googleSearchAd.headlines.length === 3, 'Google Search Ad headlines generated (3 variants)');
    assert(creative.channelCopies.reelScript.hook.length > 10, 'Instagram Reel script generated with viral hook and CTA');

    // Asset-First Save
    const asset = await aiCreativeStudioService.saveAsAsset(companyA._id, userA._id, {
      title: 'Diwali 2026 Primary Campaign Creative',
      channel: 'OMNICHANNEL',
      assetType: 'COPY',
      copyText: creative.channelCopies.whatsAppShort
    });
    assert(asset && asset.title === 'Diwali 2026 Primary Campaign Creative', 'AI Creative saved into central asset library');

    // BYOK Mode Test
    const byokConfig = await aiCreativeStudioService.updateConfig(companyA._id, {
      mode: 'BYOK',
      byokApiKey: 'sk-test-byok-openai-key-99999',
      byokProvider: 'OPENAI'
    });
    assert(byokConfig.mode === 'BYOK' && byokConfig.byokConfig.isVerified === true, 'Bring Your Own Key (BYOK) mode configured with encrypted key');

    // ==========================================
    // TEST SUITE 4: UNIFIED CAMPAIGN & CALENDAR
    // ==========================================
    console.log('\n📦 TEST SUITE 4: Unified Campaign & 1-Click 7-Day Holiday Roadmap');
    
    const roadmap = await unifiedCampaignEngine.generateHolidayRoadmap(companyA._id, userA._id, 'Diwali Grand Festival');
    assert(roadmap.campaign.channels.length === 6, 'Unified Campaign created spanning 6 channels');
    assert(roadmap.milestones.length === 7, '7-Day Omnichannel Roadmap milestones generated');

    const day4 = roadmap.milestones.find(m => m.channel === 'WHATSAPP');
    assert(day4.scheduledTime === '12:00 PM' && day4.preflightStatus === 'PASSED', 'Day 4 WhatsApp VIP broadcast scheduled with passed preflight');

    // Run Preflight Audit
    const preflight = await unifiedCampaignEngine.runCampaignPreflight(companyA._id, roadmap.campaign._id);
    assert(preflight.status === 'GENERATED' && preflight.summary.validRecipientsCount > 0, 'Campaign Preflight Audit snapshot locked (PF code generated)');

    // ==========================================
    // TEST SUITE 5: CLOSED-LOOP ROAS & ATTRIBUTION
    // ==========================================
    console.log('\n📦 TEST SUITE 5: Closed-Loop CRM Attribution & Multi-Channel ROAS');
    
    const attribution = await omnichannelAttributionEngine.calculateCampaignAttribution(companyA._id, roadmap.campaign._id);
    assert(attribution.costBreakdown.totalCost === 137420, 'Total Cross-Channel Cost calculated: ₹1,37,420');
    assert(attribution.revenue.totalAttributedRevenue === 872000, 'Total Attributed Revenue calculated: ₹8,72,000');
    assert(attribution.revenue.roasMultiplier === '6.35x', 'True Multi-Channel ROAS verified: 6.35x 🟢');
    assert(attribution.revenue.cacNumber === 1598, 'Customer Acquisition Cost (CAC) verified: ₹1,598');

    console.log(`\n==========================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('💥 Test suite crashed:', err);
    process.exit(1);
  }
}

runTests().then(() => process.exit(0));
