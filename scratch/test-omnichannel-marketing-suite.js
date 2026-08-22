const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');

async function executeOmnichannelSuite() {
  console.log('========================================================================');
  console.log('🚀 EXHAUSTIVE OMNICHANNEL MARKETING COMMAND CENTER VERIFICATION');
  console.log('========================================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'charlie-crm-super-omnichannel-secret-key-123';
  process.env.ENCRYPTION_KEY = 'charlie-crm-super-omnichannel-secret-key-123';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);

  // Models
  const Company = require('../models/Company');
  const User = require('../models/User');
  const MetaAccount = require('../models/MetaAccount');
  const SocialPost = require('../models/SocialPost');
  const MetaAdCampaign = require('../models/MetaAdCampaign');
  const MarketingHoliday = require('../models/MarketingHoliday');
  const MarketingCampaignPlan = require('../models/MarketingCampaignPlan');
  const ContentAsset = require('../models/ContentAsset');
  const MarketingApproval = require('../models/MarketingApproval');
  const MarketingAuditLog = require('../models/MarketingAuditLog');

  // Express Setup
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/social-marketing', require('../routes/socialMarketing'));
  app.use('/api/super-admin/marketing', require('../routes/superAdminMarketing'));

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // 1. SETUP MULTI-TENANT TEST ECOSYSTEM
    // ---------------------------------------------------------
    console.log('--- 1. Provisioning Tenants & RBAC Users ---');
    const companyA = await Company.create({
      name: 'Charlie Appliances India Pvt Ltd',
      code: 'CHARLIE_IND',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          whatsapp: true,
          social: true,
          reels: true,
          meta_ads: true,
          content_studio: true,
          calendar: true,
          ai_marketing: true,
          approval_workflow: true,
          monthly_post_limit: 500,
          monthly_ad_spend_limit: 100000
        }
      }
    });

    const companyB = await Company.create({
      name: 'Beta Electronics Corp',
      code: 'BETA_ELEC',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          social: false, // Commercially disabled for Company B
          meta_ads: false
        }
      }
    });

    // Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@charlieai.com',
      password: 'password123',
      role: 'super-admin',
      isActive: true
    });
    const superAdminToken = jwt.sign({ id: superAdmin._id, email: superAdmin.email, role: 'super-admin' }, process.env.JWT_SECRET);

    // Company Admin A
    const adminA = await User.create({
      name: 'Admin Alpha',
      email: 'admin@charlie.com',
      password: 'password123',
      role: 'company-admin',
      companyId: companyA._id,
      isActive: true
    });
    const tokenA = jwt.sign({ id: adminA._id, email: adminA.email, role: 'company-admin', companyId: companyA._id }, process.env.JWT_SECRET);

    // Marketing Manager A
    const managerA = await User.create({
      name: 'Marketing Manager Alpha',
      email: 'manager@charlie.com',
      password: 'password123',
      role: 'marketing-manager',
      companyId: companyA._id,
      isActive: true
    });
    const managerTokenA = jwt.sign({ id: managerA._id, email: managerA.email, role: 'marketing-manager', companyId: companyA._id }, process.env.JWT_SECRET);

    // Marketing Executive A (Cannot directly publish without approval)
    const execA = await User.create({
      name: 'Marketing Exec Alpha',
      email: 'exec@charlie.com',
      password: 'password123',
      role: 'marketing-executive',
      companyId: companyA._id,
      isActive: true
    });
    const execTokenA = jwt.sign({ id: execA._id, email: execA.email, role: 'marketing-executive', companyId: companyA._id }, process.env.JWT_SECRET);

    // Company Admin B
    const adminB = await User.create({
      name: 'Admin Beta',
      email: 'admin@beta.com',
      password: 'password123',
      role: 'company-admin',
      companyId: companyB._id,
      isActive: true
    });
    const tokenB = jwt.sign({ id: adminB._id, email: adminB.email, role: 'company-admin', companyId: companyB._id }, process.env.JWT_SECRET);

    console.log('✅ Ecosystem initialized.\n');

    // ---------------------------------------------------------
    // TEST 1: Commercial Feature Entitlement Lockdown for Company B
    // ---------------------------------------------------------
    console.log('--- Test 1: Commercial Feature Lockdown on Sub-Features ---');
    try {
      await axios.get(`${BASE_URL}/api/social-marketing/posts`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert(false, 'Company B should be blocked from social posts when commercially disabled');
    } catch (err) {
      assert(err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_ENABLED', 'Company B blocked with 403 FEATURE_NOT_ENABLED on social');
    }

    // ---------------------------------------------------------
    // TEST 2: Tenant-Isolated Meta Business Connection & Token Encryption
    // ---------------------------------------------------------
    console.log('--- Test 2: Meta Business Asset Discovery & Token Encryption ---');
    const connectRes = await axios.post(`${BASE_URL}/api/social-marketing/meta/connect`, {
      accessToken: 'mock_meta_token_alpha_12345'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(connectRes.status === 200 && connectRes.data.success, 'Company A connected Meta Business Account successfully');
    assert(connectRes.data.account.pagesCount >= 1, `Discovered ${connectRes.data.account.pagesCount} Facebook Pages`);
    assert(connectRes.data.account.instagramCount >= 1, `Discovered ${connectRes.data.account.instagramCount} Instagram Accounts`);
    assert(connectRes.data.account.adAccountsCount >= 1, `Discovered ${connectRes.data.account.adAccountsCount} Meta Ad Accounts`);

    // Verify token is encrypted at rest in MongoDB
    const metaDoc = await MetaAccount.findOne({ companyId: companyA._id }).select('+encryptedUserAccessToken');
    assert(metaDoc.encryptedUserAccessToken.includes(':') && !metaDoc.encryptedUserAccessToken.includes('mock_meta_token'), 'Meta User Access Token is AES-256-GCM encrypted at rest');

    // Verify Tenant Isolation (Company B cannot see Company A Meta assets)
    const metaBRes = await axios.get(`${BASE_URL}/api/social-marketing/meta/assets`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    }).catch(e => e.response);
    assert(metaBRes.status === 403 || metaBRes.data?.connected === false, 'Tenant Isolation: Company B has zero visibility into Company A Meta assets');

    // ---------------------------------------------------------
    // TEST 3: Charlie AI Marketing Copy & Multi-Channel Variations
    // ---------------------------------------------------------
    console.log('--- Test 3: Charlie AI Copy Engine ---');
    const aiRes = await axios.post(`${BASE_URL}/api/social-marketing/ai/multi-channel`, {
      topic: 'Smart RO Pure Water Dhamaka',
      productName: 'Charlie Smart Alkaline RO',
      offerDetails: 'Flat ₹3,000 Off + 10-Year Warranty',
      holiday: 'Diwali'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(aiRes.status === 200 && aiRes.data.success, 'AI generated multi-channel copy successfully');
    assert(aiRes.data.variations.instagramPost.caption.includes('Charlie Smart Alkaline RO'), 'Instagram caption contains targeted product name');
    assert(aiRes.data.variations.whatsAppBroadcast.caption.includes('{{name}}'), 'WhatsApp copy includes variable placeholders');
    assert(aiRes.data.variations.metaAdCopy.headlines.length > 0, 'Generated high-converting ad headlines');

    // ---------------------------------------------------------
    // TEST 4: Content Studio Asset Upload & Product Tagging
    // ---------------------------------------------------------
    console.log('--- Test 4: Centralized Content Studio Library ---');
    const assetRes = await axios.post(`${BASE_URL}/api/social-marketing/content/assets`, {
      title: 'Charlie Smart RO Festive Banner',
      assetType: 'PRODUCT_CREATIVE',
      url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800',
      productName: 'Charlie Smart Alkaline RO',
      brandName: 'Charlie',
      category: 'Water Purifiers',
      tags: ['Diwali', 'SmartRO', 'Festive']
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(assetRes.status === 201 && assetRes.data.asset._id, 'Uploaded asset into Content Studio');
    const assetId = assetRes.data.asset._id;

    // ---------------------------------------------------------
    // TEST 5: Maker-Checker Approval Workflow for Posts & Reels
    // ---------------------------------------------------------
    console.log('--- Test 5: Maker-Checker Approval Workflow ---');
    // 1. Marketing Executive creates draft post
    const execPostRes = await axios.post(`${BASE_URL}/api/social-marketing/posts`, {
      title: 'Diwali Festive Kitchen Upgrade',
      postType: 'POST',
      platforms: ['INSTAGRAM', 'FACEBOOK'],
      caption: 'Celebrate Diwali with Charlie Smart Alkaline RO! ✨ Flat ₹3,000 Off.',
      mediaUrls: [{ url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f', assetId }]
    }, {
      headers: { Authorization: `Bearer ${execTokenA}` }
    });

    assert(execPostRes.status === 201, 'Post created by Marketing Executive');
    assert(execPostRes.data.post.status === 'PENDING_APPROVAL', 'Post entered PENDING_APPROVAL status for executive');
    const postId = execPostRes.data.post._id;

    // 2. Executive cannot directly publish unapproved post (403 RBAC)
    try {
      await axios.post(`${BASE_URL}/api/social-marketing/posts/${postId}/publish`, {}, {
        headers: { Authorization: `Bearer ${execTokenA}` }
      });
      assert(false, 'Marketing Executive should be forbidden from publishing directly');
    } catch (err) {
      assert(err.response?.status === 403, 'Marketing Executive correctly blocked from publishing without approval (403)');
    }

    // 3. Marketing Manager approves submission
    const pendingApprovalsRes = await axios.get(`${BASE_URL}/api/social-marketing/approvals/pending`, {
      headers: { Authorization: `Bearer ${managerTokenA}` }
    });
    assert(pendingApprovalsRes.data.count >= 1, `Marketing Manager sees ${pendingApprovalsRes.data.count} pending approval`);

    const approvalId = pendingApprovalsRes.data.approvals[0]._id;
    const approveRes = await axios.post(`${BASE_URL}/api/social-marketing/approvals/${approvalId}/approve`, {
      notes: 'Creative and copy look stellar. Approved for launch!'
    }, {
      headers: { Authorization: `Bearer ${managerTokenA}` }
    });
    assert(approveRes.status === 200 && approveRes.data.success, 'Marketing Manager approved post submission');

    // 4. Marketing Manager publishes post to Meta Graph API
    const publishRes = await axios.post(`${BASE_URL}/api/social-marketing/posts/${postId}/publish`, {}, {
      headers: { Authorization: `Bearer ${managerTokenA}` }
    });
    assert(publishRes.status === 200 && publishRes.data.post.status === 'PUBLISHED', 'Approved post published to Facebook & Instagram');

    // ---------------------------------------------------------
    // TEST 6: 1-Click Post Boosting into Paid Meta Ad
    // ---------------------------------------------------------
    console.log('--- Test 6: 1-Click Post Boosting to Meta Ads ---');
    const boostRes = await axios.post(`${BASE_URL}/api/social-marketing/posts/${postId}/boost`, {
      dailyBudget: 500,
      durationDays: 7,
      objective: 'OUTCOME_LEADS'
    }, {
      headers: { Authorization: `Bearer ${managerTokenA}` }
    });

    assert(boostRes.status === 200 && boostRes.data.success, 'Converted organic post into paid Meta Ad campaign');
    assert(boostRes.data.adCampaign.status === 'ACTIVE', 'Boost ad campaign is ACTIVE');

    // ---------------------------------------------------------
    // TEST 7: Holiday Master Engine & 1-Click Omnichannel Roadmap
    // ---------------------------------------------------------
    console.log('--- Test 7: Holiday Master & 1-Click Campaign Roadmap ---');
    const holidaysRes = await axios.get(`${BASE_URL}/api/social-marketing/calendar/holidays`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(holidaysRes.data.count >= 8, `Loaded ${holidaysRes.data.count} master holidays & blueprints`);

    const diwaliHoliday = holidaysRes.data.holidays.find(h => h.name.includes('Diwali'));
    assert(diwaliHoliday && diwaliHoliday.campaignBlueprint.length >= 5, 'Diwali holiday contains complete multi-stage blueprint');

    const generatePlanRes = await axios.post(`${BASE_URL}/api/social-marketing/calendar/generate-campaign`, {
      holidayId: diwaliHoliday._id,
      totalBudget: 25000
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(generatePlanRes.status === 201 && generatePlanRes.data.success, '1-Click Generated full Omnichannel Campaign Roadmap');
    assert(generatePlanRes.data.plan.milestones.length >= 5, `Generated ${generatePlanRes.data.plan.milestones.length} multi-channel milestones`);

    // ---------------------------------------------------------
    // TEST 8: Immutable Marketing Audit Trail
    // ---------------------------------------------------------
    console.log('--- Test 8: Campaign-Level Immutable Audit Trail ---');
    const auditLogsRes = await axios.get(`${BASE_URL}/api/social-marketing/audit-logs`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(auditLogsRes.data.count >= 4, `Recorded ${auditLogsRes.data.count} immutable audit log entries`);

    // ---------------------------------------------------------
    // TEST 9: Super Admin Marketing Platform Governance
    // ---------------------------------------------------------
    console.log('--- Test 9: Super Admin Platform Governance Overview ---');
    const saOverviewRes = await axios.get(`${BASE_URL}/api/super-admin/marketing/overview`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(saOverviewRes.data.metrics.totalCompanies >= 2, `Super Admin tracks ${saOverviewRes.data.metrics.totalCompanies} tenants`);
    assert(saOverviewRes.data.metrics.connectedMetaCount >= 1, `Super Admin tracks connected Meta accounts: ${saOverviewRes.data.metrics.connectedMetaCount}`);

    // Super Admin re-enables social for Company B
    const updateBRes = await axios.put(`${BASE_URL}/api/super-admin/marketing/tenants/${companyB._id}/config`, {
      social: true
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(updateBRes.status === 200 && updateBRes.data.company.marketingConfig.social === true, 'Super Admin commercially enabled social for Company B');

    // Company B can now access social
    const bSocialRes = await axios.get(`${BASE_URL}/api/social-marketing/posts`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(bSocialRes.status === 200, 'Company B restored access immediately upon commercial re-enablement');

    console.log('\n========================================================================');
    console.log(`🏁 OMNICHANNEL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
    server.close();
    process.exit(1);
  }
}

executeOmnichannelSuite();
