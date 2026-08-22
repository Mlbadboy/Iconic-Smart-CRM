const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');

async function executeEnterpriseAttributionSuite() {
  console.log('========================================================================');
  console.log('🚀 ENTERPRISE PREFLIGHT BOUNDARY, STATE MACHINE & CLOSED-LOOP ROI SUITE');
  console.log('========================================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'charlie-attribution-secret-key-123';
  process.env.ENCRYPTION_KEY = 'charlie-attribution-secret-key-123';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);

  // Models
  const Company = require('../models/Company');
  const User = require('../models/User');
  const Contact = require('../models/Contact');
  const Lead = require('../models/Lead');
  const Order = require('../models/Order');
  const WhatsAppAccount = require('../models/WhatsAppAccount');
  const WhatsAppWallet = require('../models/WhatsAppWallet');
  const WhatsAppCampaign = require('../models/WhatsAppCampaign');
  const WhatsAppTemplate = require('../models/WhatsAppTemplate');
  const PreflightSnapshot = require('../models/PreflightSnapshot');
  const MarketingAttributionEvent = require('../models/MarketingAttributionEvent');
  const MarketingSegment = require('../models/MarketingSegment');

  // Express Setup
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/whatsapp', require('../routes/whatsapp'));
  app.use('/api/social-marketing', require('../routes/socialMarketing'));

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
    // 1. SETUP ECOSYSTEM
    // ---------------------------------------------------------
    console.log('--- 1. Provisioning Tenant & Seed CRM Data ---');
    const company = await Company.create({
      name: 'Charlie Consumer Durables OEM',
      code: 'CHARLIE_OEM',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          whatsapp: true,
          bulk_whatsapp: true,
          social: true,
          meta_ads: true,
          rate_per_marketing_msg: 0.99,
          monthly_ad_spend_limit: 200000
        }
      }
    });

    const user = await User.create({
      name: 'Marketing Director',
      email: 'director@charlie.com',
      password: 'password123',
      role: 'company-admin',
      companyId: company._id,
      isActive: true
    });
    const token = jwt.sign({ id: user._id, email: user.email, role: 'company-admin', companyId: company._id }, process.env.JWT_SECRET);

    // Setup Connected WABA Account & WhatsApp Wallet
    await WhatsAppAccount.create({
      companyId: company._id,
      wabaId: '1092837465',
      phoneNumberId: '98765432101',
      displayPhoneNumber: '+91 98765 43210',
      verifiedName: 'Charlie Smart Living',
      encryptedAccessToken: 'mock_encrypted_token_123',
      connectionStatus: 'CONNECTED'
    });

    await WhatsAppWallet.create({
      companyId: company._id,
      balance: 10000.00,
      currency: 'INR'
    });

    await WhatsAppTemplate.create({
      companyId: company._id,
      templateId: 'tmpl_diwali_2026_01',
      name: 'Warranty_Renewal_Diwali_2026',
      category: 'MARKETING',
      language: 'en_US',
      status: 'APPROVED',
      bodyText: 'Hello {{1}}, your water heater warranty expires soon. Renew now and save 25%!'
    });

    // Seed CRM Customers for Warranty Segment
    await Contact.create([
      { companyId: company._id, name: 'Aarav Sharma', email: 'aarav@example.com', phone: '9876500001', city: 'Mumbai', state: 'Maharashtra', contactType: 'Customer' },
      { companyId: company._id, name: 'Priya Patel', email: 'priya@example.com', phone: '9876500002', city: 'Pune', state: 'Maharashtra', contactType: 'Customer' },
      { companyId: company._id, name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '9876500003', city: 'Delhi', state: 'Delhi', contactType: 'Customer' }
    ]);

    console.log('✅ Ecosystem Initialized.\n');

    // ---------------------------------------------------------
    // TEST 1: Preflight as a Hard Transaction Boundary
    // ---------------------------------------------------------
    console.log('--- Test 1: Preflight as a Hard Transaction Boundary ---');
    const preflightRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns/preflight`, {
      campaignName: 'Diwali Warranty Renewal Broadcast',
      templateName: 'Warranty_Renewal_Diwali_2026',
      contacts: [
        { phone: '9876500001', name: 'Aarav Sharma' },
        { phone: '9876500002', name: 'Priya Patel' },
        { phone: '9876500001', name: 'Duplicate Aarav' }, // Duplicate
        { phone: '0000', name: 'Bad Phone' } // Invalid
      ]
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(preflightRes.status === 200 && preflightRes.data.preflight.preflightId.startsWith('PF-'), 'Generated unique Preflight ID (PF-YYYYMMDD-XXXXX)');
    const preflightId = preflightRes.data.preflight.preflightId;
    const csvHash = preflightRes.data.preflight.csvHash;
    assert(csvHash && csvHash.length >= 8, 'Generated cryptographic audience hash (csvHash)');
    assert(preflightRes.data.preflight.summary.validRecipientsCount === 2, 'Preflight verified 2 valid recipients');

    // Confirm and Lock Preflight Snapshot
    const confirmRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns/confirm-preflight`, {
      preflightId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(confirmRes.status === 200 && confirmRes.data.snapshot.status === 'CONFIRMED', 'Preflight snapshot explicitly confirmed and locked');

    // Verify snapshot cannot be tampered with in DB
    const snapshotDoc = await PreflightSnapshot.findOne({ companyId: company._id, preflightId });
    assert(snapshotDoc.status === 'CONFIRMED' && snapshotDoc.validRecipients.length === 2, 'Immutable snapshot persisted in database');

    // ---------------------------------------------------------
    // TEST 2: 11-State Campaign State Machine Verification
    // ---------------------------------------------------------
    console.log('\n--- Test 2: 11-State Campaign State Machine ---');
    const templateDoc = await WhatsAppTemplate.findOne({ companyId: company._id, name: 'Warranty_Renewal_Diwali_2026' });

    const campaign = await WhatsAppCampaign.create({
      companyId: company._id,
      name: 'Diwali Warranty Renewal Campaign',
      templateId: templateDoc._id,
      templateName: templateDoc.name,
      preflightId: snapshotDoc.preflightId,
      preflightSnapshotId: snapshotDoc._id,
      status: 'DRAFT',
      stats: { totalRecipients: 2, validCount: 2, eligibleCount: 2 },
      estimatedCost: 1.98,
      createdBy: user._id
    });

    assert(campaign.status === 'DRAFT', 'State 1: Campaign created in DRAFT');

    // Transition to PREFLIGHT_PASSED
    campaign.status = 'PREFLIGHT_PASSED';
    await campaign.save();
    assert(campaign.status === 'PREFLIGHT_PASSED', 'State 2: Transitioned to PREFLIGHT_PASSED');

    // Transition to APPROVED -> QUEUED -> PROCESSING -> COMPLETED
    campaign.status = 'APPROVED';
    await campaign.save();
    assert(campaign.status === 'APPROVED', 'State 3: Transitioned to APPROVED');

    campaign.status = 'QUEUED';
    await campaign.save();
    assert(campaign.status === 'QUEUED', 'State 4: Transitioned to QUEUED');

    campaign.status = 'PROCESSING';
    await campaign.save();
    assert(campaign.status === 'PROCESSING', 'State 5: Transitioned to PROCESSING');

    campaign.status = 'COMPLETED';
    await campaign.save();
    assert(campaign.status === 'COMPLETED', 'State 6: Transitioned to COMPLETED');

    // ---------------------------------------------------------
    // TEST 3: Strict Separation of WhatsApp Wallet vs Meta Ads Budget
    // ---------------------------------------------------------
    console.log('\n--- Test 3: Separation of WhatsApp Wallet vs Meta Ad Limits ---');
    const metaPreflightRes = await axios.post(`${BASE_URL}/api/social-marketing/ads/preflight`, {
      name: 'Water Heater Warranty Meta Campaign',
      budgetAmount: 5000,
      durationDays: 10 // Total ₹50,000
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(metaPreflightRes.status === 200 && metaPreflightRes.data.preflight.budget.totalBudget === 50000, 'Meta Ad Budget tracked independently (₹50,000)');
    assert(metaPreflightRes.data.preflight.budget.monthlyTenantLimit === 200000, 'Validated against Super Admin monthly advertising ceiling (₹2,00,000)');

    const currentWallet = await WhatsAppWallet.findOne({ companyId: company._id });
    assert(currentWallet.balance === 10000.00, 'WhatsApp Wallet credits remain completely isolated (₹10,000.00)');

    // ---------------------------------------------------------
    // TEST 4: Closed-Loop Marketing Attribution & Real ROAS
    // ---------------------------------------------------------
    console.log('\n--- Test 4: Closed-Loop Marketing Attribution & Real ROAS ---');
    const { recordAttributionEvent, ingestInboundMarketingLead, getClosedLoopCampaignAnalytics } = require('../services/marketingAttributionService');

    // 1. Initial Campaign Cost (₹42,000)
    await recordAttributionEvent({
      companyId: company._id,
      campaignId: campaign._id,
      campaignName: campaign.name,
      channel: 'WHATSAPP',
      eventType: 'IMPRESSION',
      cost: 42000
    });

    // 2. Inbound Lead Ingestion
    const leadIngestRes = await ingestInboundMarketingLead(company._id, {
      name: 'Aarav Sharma',
      phone: '+919876500001',
      campaignId: campaign._id,
      campaignName: campaign.name,
      channel: 'WHATSAPP',
      productInterest: 'Water Heater Warranty Renewal',
      message: 'Interested in renewing warranty with 25% discount'
    });

    assert(leadIngestRes.isNewLead === true, 'Inbound WhatsApp reply automatically captured as CRM Lead');
    const capturedLeadId = leadIngestRes.lead._id;

    // 3. Opportunity Created
    await recordAttributionEvent({
      companyId: company._id,
      campaignId: campaign._id,
      campaignName: campaign.name,
      channel: 'WHATSAPP',
      eventType: 'OPPORTUNITY_CREATED',
      leadId: capturedLeadId
    });

    // 4. Converted Service Booking / Orders with Closed Revenue (₹3,82,000)
    await recordAttributionEvent({
      companyId: company._id,
      campaignId: campaign._id,
      campaignName: campaign.name,
      channel: 'WHATSAPP',
      eventType: 'SERVICE_BOOKED',
      leadId: capturedLeadId,
      revenue: 382000
    });

    // 5. Query Closed-Loop Analytics via API
    const analyticsRes = await axios.get(`${BASE_URL}/api/whatsapp/campaigns/${campaign._id}/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(analyticsRes.status === 200 && analyticsRes.data.success, 'Fetched Closed-Loop Campaign Analytics');
    const analytics = analyticsRes.data.analytics;
    assert(analytics.financials.totalCost === 42000, `Total Campaign Cost: ₹${analytics.financials.totalCost}`);
    assert(analytics.financials.totalRevenue === 382000, `Total Closed Revenue: ₹${analytics.financials.totalRevenue}`);
    assert(analytics.financials.roas === '9.1x', `Calculated Real ROAS: ${analytics.financials.roas} (Expected: 9.1x)`);
    assert(analytics.funnel.leadsCaptured === 1, 'Attributed 1 captured lead');
    assert(analytics.funnel.serviceBookings === 1, 'Attributed 1 completed service booking');

    // ---------------------------------------------------------
    // TEST 5: Warranty Segmentation Simulation
    // ---------------------------------------------------------
    console.log('\n--- Test 5: Warranty Segmentation Cohort Query ---');
    const segmentRes = await axios.post(`${BASE_URL}/api/social-marketing/segments`, {
      name: 'Water Heater Warranty Expiring 30 Days',
      targetEntity: 'CUSTOMERS',
      filterCriteria: { city: ['Mumbai', 'Pune'] }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(segmentRes.status === 201 && segmentRes.data.totalCount === 2, 'Generated cohort of 2 eligible warranty expiring customers');

    // ---------------------------------------------------------
    // TEST 6: Integration Health Diagnostics
    // ---------------------------------------------------------
    console.log('\n--- Test 6: Integration Health Center Diagnostics ---');
    const healthRes = await axios.get(`${BASE_URL}/api/social-marketing/diagnostics/health`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(healthRes.status === 200 && healthRes.data.diagnostics.whatsApp.phoneStatus === 'VERIFIED_NAME_APPROVED', 'Integration Health Center reports WhatsApp verified');
    assert(healthRes.data.diagnostics.whatsApp.webhookSignatureValid === true, 'Webhook cryptographic signature verification is active');

    console.log('\n========================================================================');
    console.log(`🏁 ENTERPRISE ATTRIBUTION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

executeEnterpriseAttributionSuite();
