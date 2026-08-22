const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');

async function executePreflightAndClosedLoopSuite() {
  console.log('========================================================================');
  console.log('🚀 ENTERPRISE PREFLIGHT & CLOSED-LOOP CRM MARKETING VERIFICATION');
  console.log('========================================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'charlie-preflight-secret-key-123';
  process.env.ENCRYPTION_KEY = 'charlie-preflight-secret-key-123';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);

  // Models
  const Company = require('../models/Company');
  const User = require('../models/User');
  const Contact = require('../models/Contact');
  const Lead = require('../models/Lead');
  const WhatsAppAccount = require('../models/WhatsAppAccount');
  const WhatsAppContact = require('../models/WhatsAppContact');
  const WhatsAppTemplate = require('../models/WhatsAppTemplate');
  const MetaAccount = require('../models/MetaAccount');
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
    // 1. SETUP ECOSYSTEM & DATA
    // ---------------------------------------------------------
    console.log('--- 1. Provisioning Tenant & Seed CRM Data ---');
    const company = await Company.create({
      name: 'Charlie Smart Living Pvt Ltd',
      code: 'CHARLIE_LIVING',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          whatsapp: true,
          bulk_whatsapp: true,
          social: true,
          meta_ads: true,
          rate_per_marketing_msg: 0.99,
          monthly_ad_spend_limit: 50000
        }
      }
    });

    const user = await User.create({
      name: 'Marketing Lead',
      email: 'lead@charlie.com',
      password: 'password123',
      role: 'company-admin',
      companyId: company._id,
      isActive: true
    });
    const token = jwt.sign({ id: user._id, email: user.email, role: 'company-admin', companyId: company._id }, process.env.JWT_SECRET);

    // Setup Connected WABA Account
    const waba = await WhatsAppAccount.create({
      companyId: company._id,
      wabaId: '1092837465',
      phoneNumberId: '98765432101',
      displayPhoneNumber: '+91 98765 43210',
      verifiedName: 'Charlie Smart Living',
      encryptedAccessToken: 'mock_encrypted_token_123',
      connectionStatus: 'CONNECTED',
      walletBalance: 500.00,
      currency: 'INR'
    });

    const WhatsAppWallet = require('../models/WhatsAppWallet');
    const wallet = await WhatsAppWallet.create({
      companyId: company._id,
      balance: 500.00,
      currency: 'INR'
    });

    // Create Opted-Out Contact in CRM
    await WhatsAppContact.create({
      companyId: company._id,
      name: 'Opted Out User',
      mobile: '9999900001',
      normalizedPhone: '+919999900001',
      whatsappOptIn: false
    });

    // Create Sample CRM Contacts & Leads
    await Contact.create([
      { companyId: company._id, name: 'Vikram Mehta', email: 'vikram@example.com', phone: '9876500001', city: 'Mumbai', state: 'Maharashtra', contactType: 'Customer' },
      { companyId: company._id, name: 'Ananya Sharma', email: 'ananya@example.com', phone: '9876500002', city: 'Mumbai', state: 'Maharashtra', contactType: 'Customer' },
      { companyId: company._id, name: 'Rohan Gupta', email: 'rohan@example.com', phone: '9876500003', city: 'Delhi', state: 'Delhi', contactType: 'Customer' }
    ]);

    await Lead.create([
      { companyId: company._id, name: 'Kavita Singh', email: 'kavita@example.com', phone: '9876500004', city: 'Pune', status: 'new', productInterest: 'Smart Alkaline RO' },
      { companyId: company._id, name: 'Sanjay Deshmukh', email: 'sanjay@example.com', phone: '9876500005', city: 'Mumbai', status: 'lost', productInterest: 'Water Heater' }
    ]);

    console.log('✅ Tenant & CRM Data Ready.\n');

    // ---------------------------------------------------------
    // TEST GROUP 1: WhatsApp Campaign Preflight Engine
    // ---------------------------------------------------------
    console.log('--- Test Group 1: WhatsApp Campaign Preflight Audit ---');
    const preflightRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns/preflight`, {
      contacts: [
        { phone: '9876511111', name: 'Valid User 1', email: 'u1@example.com' },
        { phone: '+919876522222', name: 'Valid User 2' },
        { phone: '12345', name: 'Invalid Phone Number' }, // Invalid format
        { phone: '9876511111', name: 'Duplicate Row' }, // Duplicate
        { phone: '9999900001', name: 'Opted Out Contact' } // Opted-out
      ],
      templateName: 'Diwali_Offer_2026'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(preflightRes.status === 200 && preflightRes.data.success, 'Preflight API responded successfully');
    const pf = preflightRes.data.preflight;
    assert(pf.summary.totalRecords === 5, `Preflight totalRecords: ${pf.summary.totalRecords} (Expected: 5)`);
    assert(pf.summary.validNumbers === 2, `Preflight validNumbers: ${pf.summary.validNumbers} (Expected: 2)`);
    assert(pf.summary.invalidNumbers === 1, `Preflight invalidNumbers: ${pf.summary.invalidNumbers} (Expected: 1)`);
    assert(pf.summary.duplicateCount === 1, `Preflight duplicates: ${pf.summary.duplicateCount} (Expected: 1)`);
    assert(pf.summary.optedOutCount === 1, `Preflight optedOut: ${pf.summary.optedOutCount} (Expected: 1)`);
    assert(pf.financials.estimatedCost === 1.98, `Estimated cost ₹${pf.financials.estimatedCost} calculated accurately (2 * ₹0.99)`);
    assert(pf.financials.isWalletSufficient === true, 'Preflight confirmed wallet balance sufficiency (₹500 >= ₹1.98)');
    assert(pf.invalidRows.length === 3, `Preflight captured ${pf.invalidRows.length} invalid rows for downloadable CSV`);

    // Insufficient Wallet Balance Preflight Test
    wallet.balance = 1.00; // Drop wallet balance
    await wallet.save();

    const lowBalPreflightRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns/preflight`, {
      contacts: [
        { phone: '9876511111', name: 'User 1' },
        { phone: '9876522222', name: 'User 2' }
      ],
      templateName: 'Diwali_Offer_2026'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const lowPf = lowBalPreflightRes.data.preflight;
    assert(lowPf.financials.isWalletSufficient === false, 'Preflight detected insufficient wallet balance (₹1.00 < ₹1.98)');
    assert(lowPf.financials.balanceDeficit === 0.98, `Calculated exact deficit: ₹${lowPf.financials.balanceDeficit}`);

    // ---------------------------------------------------------
    // TEST GROUP 2: Meta Ads Preflight & Budget Safeguards
    // ---------------------------------------------------------
    console.log('\n--- Test Group 2: Meta Ads Preflight & Spend Limits ---');
    const adPreflightRes = await axios.post(`${BASE_URL}/api/social-marketing/ads/preflight`, {
      name: 'Diwali Appliance Lead Campaign',
      objective: 'OUTCOME_LEADS',
      budgetAmount: 1000,
      durationDays: 7,
      targeting: { locations: ['Maharashtra', 'Gujarat'] }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(adPreflightRes.status === 200 && adPreflightRes.data.success, 'Meta Ads Preflight returned validation');
    const adPf = adPreflightRes.data.preflight;
    assert(adPf.budget.totalBudget === 7000, 'Calculated total campaign spend ₹7,000 (7 * ₹1,000)');
    assert(adPf.budget.isBudgetWithinLimit === true, 'Spend is within tenant monthly limit (₹7,000 <= ₹50,000)');
    assert(adPf.estimates.dailyReachRange.includes('people'), 'Generated daily reach estimation range');

    // Test Exceeding Monthly Spend Cap
    const overBudgetRes = await axios.post(`${BASE_URL}/api/social-marketing/ads/preflight`, {
      name: 'Mega Budget Ad',
      budgetAmount: 10000,
      durationDays: 10 // Total ₹100,000 > Limit ₹50,000
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(overBudgetRes.data.preflight.budget.isBudgetWithinLimit === false, 'Blocked spend exceeding tenant monthly cap');
    assert(overBudgetRes.data.preflight.warnings.length > 0, 'Generated actionable warning for Super Admin limit');

    // ---------------------------------------------------------
    // TEST GROUP 3: Closed-Loop CRM Customer Segmentation
    // ---------------------------------------------------------
    console.log('\n--- Test Group 3: Closed-Loop CRM Customer Cohorts ---');
    // 1. Create Mumbai Customers Segment
    const segmentRes = await axios.post(`${BASE_URL}/api/social-marketing/segments`, {
      name: 'Mumbai High-Value Customer Cohort',
      targetEntity: 'CUSTOMERS',
      filterCriteria: { city: ['Mumbai'] }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(segmentRes.status === 201 && segmentRes.data.success, 'Created dynamic CRM segment');
    assert(segmentRes.data.totalCount === 2, `Segment resolved ${segmentRes.data.totalCount} Mumbai customers (Expected: 2)`);
    const segmentId = segmentRes.data.segment._id;

    // 2. Resolve Segment directly for Campaign Dispatch
    const contactsRes = await axios.get(`${BASE_URL}/api/social-marketing/segments/${segmentId}/contacts`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(contactsRes.status === 200 && contactsRes.data.count === 2, `Exported ${contactsRes.data.count} contacts from CRM segment`);
    assert(contactsRes.data.contacts[0].phone.startsWith('+91'), 'Contacts normalized to +91 E.164');

    // ---------------------------------------------------------
    // TEST GROUP 4: External Third-Party Diagnostics Engine
    // ---------------------------------------------------------
    console.log('\n--- Test Group 4: Third-Party Meta & WhatsApp Diagnostics ---');
    const diagRes = await axios.get(`${BASE_URL}/api/social-marketing/diagnostics/health`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert(diagRes.status === 200 && diagRes.data.success, 'Diagnostic suite ran successfully');
    assert(diagRes.data.diagnostics.whatsApp.phoneStatus === 'VERIFIED_NAME_APPROVED', 'WABA phone number verified and healthy');

    // Test Meta Error Code Classification
    const { classifyMetaApiError } = require('../services/metaDiagnosticService');
    const err190 = classifyMetaApiError({ response: { data: { error: { code: 190, message: 'Invalid OAuth 2.0 Access Token' } } } });
    assert(err190.code === 190 && err190.guidance.includes('OAuth'), 'Mapped Meta Error 190 (Token Expired) to re-authentication guidance');

    const err131030 = classifyMetaApiError({ response: { data: { error: { code: 131030, message: 'Message rate limit exceeded' } } } });
    assert(err131030.code === 131030 && err131030.guidance.includes('velocity'), 'Mapped WhatsApp Cloud API Error 131030 to rate-limit guidance');

    console.log('\n========================================================================');
    console.log(`🏁 PREFLIGHT & CLOSED-LOOP SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

executePreflightAndClosedLoopSuite();
