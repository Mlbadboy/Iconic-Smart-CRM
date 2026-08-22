const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');

async function runProductionMarketingAcceptance() {
  console.log('========================================================================');
  console.log('🚀 CHARLIE CRM — PRODUCTION MARKETING ACCEPTANCE & HARDENING MATRIX');
  console.log('========================================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'charlie-prod-acceptance-key-2026';
  process.env.ENCRYPTION_KEY = 'charlie-prod-acceptance-key-2026';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);

  // Models
  const Company = require('../models/Company');
  const User = require('../models/User');
  const Role = require('../models/Role');
  const Contact = require('../models/Contact');
  const Lead = require('../models/Lead');
  const Order = require('../models/Order');
  const WhatsAppAccount = require('../models/WhatsAppAccount');
  const WhatsAppWallet = require('../models/WhatsAppWallet');
  const WhatsAppCampaign = require('../models/WhatsAppCampaign');
  const WhatsAppTemplate = require('../models/WhatsAppTemplate');
  const PreflightSnapshot = require('../models/PreflightSnapshot');
  const MetaAccount = require('../models/MetaAccount');
  const SocialPost = require('../models/SocialPost');
  const MetaAdCampaign = require('../models/MetaAdCampaign');
  const ContentAsset = require('../models/ContentAsset');
  const MarketingHoliday = require('../models/MarketingHoliday');
  const MarketingAttributionEvent = require('../models/MarketingAttributionEvent');
  const MarketingSegment = require('../models/MarketingSegment');

  // Express Setup
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/tenant', require('../routes/tenant'));
  app.use('/api/whatsapp', require('../routes/whatsapp'));
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
    // 1. PROVISIONING TENANTS & ROLES
    // ---------------------------------------------------------
    console.log('--- 1. Provisioning Tenants & Multi-Role Ecosystem ---');
    const companyA = await Company.create({
      name: 'Alpha Consumer Durables Pvt Ltd',
      code: 'ALPHA_DURABLES',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          whatsapp: true,
          bulk_whatsapp: true,
          social: true,
          reels: true,
          meta_ads: true,
          content_studio: true,
          calendar: true,
          ai_marketing: true,
          approval_workflow: true,
          rate_per_marketing_msg: 0.99,
          monthly_ad_spend_limit: 150000
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
          whatsapp: false, // WhatsApp disabled by Super Admin
          social: false,
          meta_ads: false
        }
      }
    });

    const superAdminUser = await User.create({
      name: 'Global Platform Admin',
      email: 'superadmin@charlie.com',
      password: 'password123',
      role: 'super-admin',
      isActive: true
    });
    const superAdminToken = jwt.sign({ id: superAdminUser._id, email: superAdminUser.email, role: 'super-admin' }, process.env.JWT_SECRET);

    const adminA = await User.create({
      name: 'Alpha Company Admin',
      email: 'admin@alpha.com',
      password: 'password123',
      role: 'company-admin',
      companyId: companyA._id,
      isActive: true
    });
    const adminAToken = jwt.sign({ id: adminA._id, email: adminA.email, role: 'company-admin', companyId: companyA._id }, process.env.JWT_SECRET);

    const execRole = await Role.create({
      name: 'Marketing Executive',
      code: 'MKT_EXEC',
      companyId: companyA._id,
      permissions: ['marketing.view', 'marketing.campaign.create', 'marketing.content.upload']
    });

    const execA = await User.create({
      name: 'Junior Marketer',
      email: 'junior@alpha.com',
      password: 'password123',
      role: 'marketing-executive',
      customRoleId: execRole._id,
      companyId: companyA._id,
      isActive: true
    });
    const execAToken = jwt.sign({ id: execA._id, email: execA.email, role: 'marketing-executive', companyId: companyA._id }, process.env.JWT_SECRET);

    // Setup Connected Accounts
    await WhatsAppAccount.create({
      companyId: companyA._id,
      wabaId: '1092837465',
      phoneNumberId: '98765432101',
      displayPhoneNumber: '+91 98765 43210',
      verifiedName: 'Alpha Durables',
      encryptedAccessToken: 'mock_token_123',
      connectionStatus: 'CONNECTED'
    });

    const WhatsAppWalletModel = require('../models/WhatsAppWallet');
    await WhatsAppWalletModel.create({
      companyId: companyA._id,
      balance: 18500.00,
      currency: 'INR'
    });

    const tmplA = await WhatsAppTemplate.create({
      companyId: companyA._id,
      templateId: 'tmpl_alpha_festive_01',
      name: 'Diwali_Festive_Renewal_V2',
      category: 'MARKETING',
      language: 'en_US',
      status: 'APPROVED',
      bodyText: 'Hello {{1}}, renew your appliance warranty today and get 30% off!'
    });

    // Seed CRM Customers for Warranty Cohort
    await Contact.create([
      { companyId: companyA._id, name: 'Kavita Verma', email: 'kavita@verma.com', phone: '9876500011', city: 'Mumbai', state: 'Maharashtra', contactType: 'Customer' },
      { companyId: companyA._id, name: 'Deepak Joshi', email: 'deepak@joshi.com', phone: '9876500012', city: 'Pune', state: 'Maharashtra', contactType: 'Customer' }
    ]);

    console.log('✅ Ecosystem Initialized.\n');

    // ---------------------------------------------------------
    // TEST MATRIX A: Commercial Entitlements Gate
    // ---------------------------------------------------------
    console.log('--- A. Commercial Entitlement Strict Gating ---');
    let blockedB = false;
    try {
      await axios.get(`${BASE_URL}/api/whatsapp/account`, {
        headers: { Authorization: `Bearer ${jwt.sign({ id: 'u_b', role: 'company-admin', companyId: companyB._id }, process.env.JWT_SECRET)}` }
      });
    } catch (e) {
      if (e.response?.status === 403) blockedB = true;
    }
    assert(blockedB === true, 'Tenant B blocked with HTTP 403 on disabled subfeature');

    // Super Admin re-enables subfeature for Company B
    const updateEntitlementRes = await axios.put(`${BASE_URL}/api/super-admin/marketing/tenants/${companyB._id}/config`, {
      whatsapp: true,
      bulk_whatsapp: true,
      rate_per_marketing_msg: 0.85
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(updateEntitlementRes.status === 200 && updateEntitlementRes.data.company.marketingConfig.whatsapp === true, 'Super Admin commercially re-enabled WhatsApp for Company B');

    // ---------------------------------------------------------
    // TEST MATRIX D & E: Hard Preflight Gate & Transactional Wallet Ledger
    // ---------------------------------------------------------
    console.log('\n--- D & E. Preflight Hard Gate & Transactional Wallet Accounting ---');
    const preflightRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns/preflight`, {
      campaignName: 'Diwali Festive Broadcast 2026',
      templateName: 'Diwali_Festive_Renewal_V2',
      contacts: [
        { phone: '9876500011', name: 'Kavita Verma' },
        { phone: '9876500012', name: 'Deepak Joshi' },
        { phone: '9876500011', name: 'Duplicate Kavita' } // Duplicate
      ]
    }, {
      headers: { Authorization: `Bearer ${adminAToken}` }
    });

    const pf = preflightRes.data.preflight;
    assert(pf.preflightId.startsWith('PF-'), `Generated Preflight ID: ${pf.preflightId}`);
    assert(pf.summary.validRecipientsCount === 2, 'Preflight verified 2 valid recipients');
    assert(pf.financials.estimatedCost === 1.98, `Estimated cost ₹${pf.financials.estimatedCost} calculated`);

    // Lock preflight
    await axios.post(`${BASE_URL}/api/whatsapp/campaigns/confirm-preflight`, {
      preflightId: pf.preflightId
    }, {
      headers: { Authorization: `Bearer ${adminAToken}` }
    });

    // Transactional Wallet Ledger Reservation
    const { reserveWalletFunds, releaseUnusedReservation } = require('../services/walletLedgerService');
    const reserveRes = await reserveWalletFunds(companyA._id, 'CAM_DURABLES_01', 11524.59, `res_key_${Date.now()}`, adminA._id);
    assert(reserveRes.success && reserveRes.reservedAmount === 11524.59, `Reserved ₹11,524.59 funds. Balance: ₹${reserveRes.balance}`);

    // Release unused reservation
    const releaseRes = await releaseUnusedReservation(companyA._id, 'CAM_DURABLES_01', 106.76, `rel_key_${Date.now()}`, adminA._id);
    assert(releaseRes.success && releaseRes.releasedAmount === 106.76, `Released ₹106.76 unused funds. Closing Balance: ₹${releaseRes.balance}`);

    // ---------------------------------------------------------
    // TEST MATRIX F: Centralized Campaign State Machine
    // ---------------------------------------------------------
    console.log('\n--- F. Centralized Campaign State Machine ---');
    const { transitionCampaignState, VALID_TRANSITIONS } = require('../services/campaignStateMachineService');

    const campDoc = await WhatsAppCampaign.create({
      companyId: companyA._id,
      name: 'Diwali State Machine Test',
      templateId: tmplA._id,
      templateName: tmplA.name,
      preflightId: pf.preflightId,
      createdBy: adminA._id,
      status: 'DRAFT'
    });

    // Legal transition: DRAFT -> PREFLIGHT_PASSED -> QUEUED -> PROCESSING -> COMPLETED
    await transitionCampaignState(campDoc._id, companyA._id, 'PREFLIGHT_PASSED', {}, adminA._id);
    await transitionCampaignState(campDoc._id, companyA._id, 'QUEUED', {}, adminA._id);
    await transitionCampaignState(campDoc._id, companyA._id, 'PROCESSING', {}, adminA._id);
    const finalCamp = await transitionCampaignState(campDoc._id, companyA._id, 'COMPLETED', {}, adminA._id);
    assert(finalCamp.status === 'COMPLETED', 'State Machine completed full lifecycle: DRAFT ➔ COMPLETED');

    // Illegal transition attempt: COMPLETED -> PROCESSING (Should Throw)
    let illegalBlocked = false;
    try {
      await transitionCampaignState(campDoc._id, companyA._id, 'PROCESSING', {}, adminA._id);
    } catch (e) {
      illegalBlocked = true;
    }
    assert(illegalBlocked === true, 'State Machine rejected illegal transition from COMPLETED to PROCESSING');

    // ---------------------------------------------------------
    // TEST MATRIX L: Closed-Loop CRM Attribution & ROAS
    // ---------------------------------------------------------
    console.log('\n--- L. Closed-Loop CRM Attribution & Real ROAS ---');
    const { recordAttributionEvent, ingestInboundMarketingLead, getClosedLoopCampaignAnalytics } = require('../services/marketingAttributionService');

    // Record Campaign Cost (₹42,000)
    await recordAttributionEvent({
      companyId: companyA._id,
      campaignId: campDoc._id,
      campaignName: campDoc.name,
      channel: 'WHATSAPP',
      eventType: 'IMPRESSION',
      cost: 42000
    });

    // Ingest Inbound Lead
    const leadRes = await ingestInboundMarketingLead(companyA._id, {
      name: 'Kavita Verma',
      phone: '+919876500011',
      campaignId: campDoc._id,
      campaignName: campDoc.name,
      productInterest: 'Smart Water Heater Warranty'
    });
    assert(leadRes.lead && leadRes.lead.source.includes(campDoc.name), 'Inbound lead ingested with source campaign tag');

    // Service booking with revenue ₹3,82,000
    await recordAttributionEvent({
      companyId: companyA._id,
      campaignId: campDoc._id,
      campaignName: campDoc.name,
      channel: 'WHATSAPP',
      eventType: 'SERVICE_BOOKED',
      leadId: leadRes.lead._id,
      revenue: 382000
    });

    const analyticsRes = await axios.get(`${BASE_URL}/api/whatsapp/campaigns/${campDoc._id}/analytics`, {
      headers: { Authorization: `Bearer ${adminAToken}` }
    });
    assert(analyticsRes.data.analytics.financials.roas === '9.1x', `Closed-Loop ROAS calculated: ${analyticsRes.data.analytics.financials.roas} (Revenue ₹3.82L / Cost ₹42K)`);

    // ---------------------------------------------------------
    // TEST MATRIX N & O: Meta Ads Preflight & Diagnostic Center
    // ---------------------------------------------------------
    console.log('\n--- N & O. Meta Ads Preflight & Integration Health Center ---');
    const metaPfRes = await axios.post(`${BASE_URL}/api/social-marketing/ads/preflight`, {
      name: 'Diwali Festive Meta Lead Ad',
      budgetAmount: 10000,
      durationDays: 10
    }, {
      headers: { Authorization: `Bearer ${adminAToken}` }
    });
    assert(metaPfRes.status === 200 && metaPfRes.data.preflight.budget.totalBudget === 100000, 'Meta Ad Budget preflight validated against tenant cap');

    const diagRes = await axios.get(`${BASE_URL}/api/social-marketing/diagnostics/health`, {
      headers: { Authorization: `Bearer ${adminAToken}` }
    });
    assert(diagRes.status === 200 && diagRes.data.diagnostics.whatsApp.phoneStatus === 'VERIFIED_NAME_APPROVED', 'Diagnostic Center verified WABA phone status');

    console.log('\n========================================================================');
    console.log(`🏁 PRODUCTION MARKETING ACCEPTANCE MATRIX: ${passed} PASSED, ${failed} FAILED`);
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

runProductionMarketingAcceptance();
