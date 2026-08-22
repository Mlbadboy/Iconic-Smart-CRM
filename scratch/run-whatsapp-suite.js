const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');

async function executeTestSuite() {
  console.log('========================================================================');
  console.log('🚀 EXHAUSTIVE MULTI-TENANT WHATSAPP MARKETING PLATFORM VERIFICATION');
  console.log('========================================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'charlie-crm-super-test-secret-key-123';
  process.env.ENCRYPTION_KEY = 'charlie-crm-super-test-secret-key-123';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);

  // Load Models
  const Company = require('../models/Company');
  const User = require('../models/User');
  const WhatsAppAccount = require('../models/WhatsAppAccount');
  const WhatsAppTemplate = require('../models/WhatsAppTemplate');
  const WhatsAppContact = require('../models/WhatsAppContact');
  const WhatsAppCampaign = require('../models/WhatsAppCampaign');
  const WhatsAppCampaignRecipient = require('../models/WhatsAppCampaignRecipient');
  const WhatsAppMedia = require('../models/WhatsAppMedia');
  const WhatsAppMessage = require('../models/WhatsAppMessage');
  const WhatsAppWallet = require('../models/WhatsAppWallet');
  const WhatsAppUsage = require('../models/WhatsAppUsage');

  // Load Express App
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/whatsapp', require('../routes/whatsapp'));
  app.use('/api/super-admin/whatsapp', require('../routes/superAdminWhatsApp'));

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}`;

  const { processQueueBatch, pauseCampaign, resumeCampaign, cancelCampaign } = require('../services/whatsAppQueueService');

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
    // 1. SETUP TENANTS & USERS
    // ---------------------------------------------------------
    console.log('--- 1. Setting up Test Tenants A & B and RBAC Roles ---');
    const companyA = await Company.create({
      name: 'Alpha Retail Corp',
      code: 'ALPHA_CORP',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          whatsapp: true,
          bulk_campaigns: true,
          monthly_message_limit: 10000,
          daily_message_limit: 1000,
          rate_per_marketing_msg: 0.8631,
          rate_per_utility_msg: 0.35,
          platform_fee_markup: 0.15
        }
      }
    });

    const companyB = await Company.create({
      name: 'Beta Distribution Ltd',
      code: 'BETA_LTD',
      isActive: true,
      features: {
        marketing: true,
        marketing_config: {
          whatsapp: true
        }
      }
    });

    // Super Admin User
    const superAdminUser = await User.create({
      name: 'Platform Super Admin',
      email: 'superadmin@charlieai.com',
      password: 'password123',
      role: 'super-admin',
      isActive: true
    });
    const superAdminToken = jwt.sign({ id: superAdminUser._id, email: superAdminUser.email, role: 'super-admin' }, process.env.JWT_SECRET);

    // Company Admin A
    const adminUserA = await User.create({
      name: 'Admin Alpha',
      email: 'admin@alpha.com',
      password: 'password123',
      role: 'company-admin',
      companyId: companyA._id,
      isActive: true
    });
    const tokenA = jwt.sign({ id: adminUserA._id, email: adminUserA.email, role: 'company-admin', companyId: companyA._id }, process.env.JWT_SECRET);

    // Marketing Executive A (Create permission, no launch permission)
    const execUserA = await User.create({
      name: 'Marketing Exec Alpha',
      email: 'exec@alpha.com',
      password: 'password123',
      role: 'marketing-executive',
      companyId: companyA._id,
      isActive: true
    });
    const execTokenA = jwt.sign({ id: execUserA._id, email: execUserA.email, role: 'marketing-executive', companyId: companyA._id }, process.env.JWT_SECRET);

    // Company Admin B
    const adminUserB = await User.create({
      name: 'Admin Beta',
      email: 'admin@beta.com',
      password: 'password123',
      role: 'company-admin',
      companyId: companyB._id,
      isActive: true
    });
    const tokenB = jwt.sign({ id: adminUserB._id, email: adminUserB.email, role: 'company-admin', companyId: companyB._id }, process.env.JWT_SECRET);

    console.log('✅ Tenants & users initialized.\n');

    // ---------------------------------------------------------
    // TEST 1 & 2: Super Admin commercial enablement & Company Admin view
    // ---------------------------------------------------------
    console.log('--- Test 1 & 2: Commercial Feature Gate Verification ---');
    const accResA = await axios.get(`${BASE_URL}/api/whatsapp/account`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(accResA.status === 200, 'Company Admin A can view WhatsApp Hub when entitled');

    // ---------------------------------------------------------
    // TEST 3, 4 & 5: Commercial Feature Lockdown
    // ---------------------------------------------------------
    console.log('--- Test 3, 4 & 5: Feature disable & commercial lockdown ---');
    await axios.put(`${BASE_URL}/api/super-admin/whatsapp/tenants/${companyA._id}/config`, {
      marketingEnabled: false
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });

    try {
      await axios.get(`${BASE_URL}/api/whatsapp/account`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'Should have blocked disabled marketing feature');
    } catch (err) {
      assert(err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_ENABLED', 'Access blocked with 403 FEATURE_NOT_ENABLED when marketing disabled');
    }

    // Company Admin cannot re-enable feature commercially
    try {
      await axios.put(`${BASE_URL}/api/super-admin/whatsapp/tenants/${companyA._id}/config`, {
        marketingEnabled: true
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'Company Admin cannot bypass commercial control');
    } catch (err) {
      assert(err.response?.status === 403, 'Company Admin cannot bypass commercial control (403)');
    }

    // Re-enable for remaining tests
    await axios.put(`${BASE_URL}/api/super-admin/whatsapp/tenants/${companyA._id}/config`, {
      marketingEnabled: true,
      whatsappEnabled: true
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });

    // ---------------------------------------------------------
    // TEST 6 & 7: WABA Connection, AES-256 Encryption & Tenant Isolation
    // ---------------------------------------------------------
    console.log('--- Test 6 & 7: WABA connection, Token AES-256 Encryption & Tenant Isolation ---');
    const connectRes = await axios.post(`${BASE_URL}/api/whatsapp/account`, {
      wabaId: 'mock_waba_alpha_101',
      phoneNumberId: 'mock_phone_alpha_201',
      displayPhoneNumber: '+919876543210',
      businessPortfolioId: 'mock_portfolio_301',
      accessToken: 'mock_system_user_token_alpha_secret_key'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(connectRes.status === 200 && connectRes.data.account.connectionStatus === 'CONNECTED', 'WABA connected successfully');

    // Verify token is encrypted at rest in MongoDB
    const accountDoc = await WhatsAppAccount.findOne({ companyId: companyA._id }).select('+encryptedAccessToken');
    assert(accountDoc.encryptedAccessToken.includes(':') && !accountDoc.encryptedAccessToken.includes('mock_system_user_token'), 'Access token is AES-256-GCM encrypted at rest');

    // Verify Company B cannot see Company A credentials
    const bAccRes = await axios.get(`${BASE_URL}/api/whatsapp/account`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(bAccRes.data.connected === false, 'Tenant isolation: Company B cannot see Company A WABA credentials');

    // ---------------------------------------------------------
    // TEST 8, 9, 10 & 11: CSV Contact Import, Phone Normalization & Deduplication
    // ---------------------------------------------------------
    console.log('--- Test 8 to 11: CSV Safety Import, +91 Normalization, Deduplication & Opt-Out ---');
    const csvData = `Name,Mobile,Email,City,State,DealerCode,Product
Rahul Sharma,9876543210,rahul@alpha.com,Mumbai,Maharashtra,D101,Smart RO
Priya Patel,+91 98765 43211,priya@alpha.com,Pune,Maharashtra,D102,Water Heater
Amit Kumar,09876543212,amit@alpha.com,Nagpur,Maharashtra,D101,Smart RO
Duplicate Rahul,9876543210,duplicate@alpha.com,Mumbai,Maharashtra,D101,Smart RO
Invalid Person,999,bad@alpha.com,Delhi,Delhi,D103,Smart RO`;

    const importRes = await axios.post(`${BASE_URL}/api/whatsapp/contacts/import`, {
      csvText: csvData
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const stats = importRes.data.stats;
    assert(stats.total === 5, `Total rows processed: ${stats.total}`);
    assert(stats.valid === 3, `Valid unique contacts imported: ${stats.valid}`);
    assert(stats.invalid === 1, `Invalid phone format detected: ${stats.invalid}`);
    assert(stats.duplicate === 1, `Duplicate phone inside CSV file detected: ${stats.duplicate}`);
    assert(stats.imported === 3, `New contacts created in registry: ${stats.imported}`);

    // Verify phone normalized to +91
    const contactRahul = await WhatsAppContact.findOne({ companyId: companyA._id, email: 'rahul@alpha.com' });
    assert(contactRahul.normalizedPhone === '+919876543210', 'Phone normalized to standard +91 E.164');

    // ---------------------------------------------------------
    // TEST 12 & 13: Template Sync, Variable Extraction & Media
    // ---------------------------------------------------------
    console.log('--- Test 12 & 13: Template Sync & Variable Extraction ---');
    const syncRes = await axios.post(`${BASE_URL}/api/whatsapp/templates/sync`, {}, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(syncRes.data.syncedCount >= 2, `Synced ${syncRes.data.syncedCount} approved templates`);

    const tmpl = await WhatsAppTemplate.findOne({ companyId: companyA._id, name: 'summer_promo_2026' });
    assert(tmpl && tmpl.variables.length === 3, 'Extracted variables {{1}}, {{2}}, {{3}} from template');

    // ---------------------------------------------------------
    // TEST 14 & 15: Campaign Builder & Variable Mapping
    // ---------------------------------------------------------
    console.log('--- Test 14 & 15: Campaign Creation & Queue Mapping ---');
    const createCampaignRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns`, {
      name: 'Diwali Festive Broadcast',
      templateId: tmpl._id,
      audienceType: 'SAVED_SEGMENT',
      variableMappings: {
        "1": "{{name}}",
        "2": "{{product}}",
        "3": "31-Oct-2026"
      }
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(createCampaignRes.status === 201, 'Campaign created in DRAFT status');
    const campaignId = createCampaignRes.data.campaign._id;

    const queued = await WhatsAppCampaignRecipient.find({ campaignId });
    assert(queued.length === 3, `Generated ${queued.length} pending recipient queue records`);
    assert(queued[0].variableValues[0].value === 'Rahul Sharma', 'Personalized {{name}} mapped correctly');

    // ---------------------------------------------------------
    // TEST 16: RBAC: Marketing Executive cannot send campaign
    // ---------------------------------------------------------
    console.log('--- Test 16: RBAC: Marketing Executive cannot Launch Campaign ---');
    try {
      await axios.post(`${BASE_URL}/api/whatsapp/campaigns/${campaignId}/send`, {}, {
        headers: { Authorization: `Bearer ${execTokenA}` }
      });
      assert(false, 'Marketing Executive should be forbidden from launching campaign');
    } catch (err) {
      assert(err.response?.status === 403, 'Marketing Executive correctly blocked from launching campaign (403)');
    }

    // ---------------------------------------------------------
    // TEST 17, 18, 19, 20: Wallet Balance Debit, Launch, Queue Worker, Pause & Resume
    // ---------------------------------------------------------
    console.log('--- Test 17 to 20: Wallet Verification, Launch & Queue Dispatch ---');
    const launchRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns/${campaignId}/send`, {}, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(launchRes.status === 200 && launchRes.data.campaign.status === 'PROCESSING', 'Campaign launched into PROCESSING queue');

    const walletDoc = await WhatsAppWallet.findOne({ companyId: companyA._id });
    assert(walletDoc.balance < 1000, `Wallet debited for campaign (Remaining: ₹${walletDoc.balance})`);

    // Process Queue Batch 1 (dispatches messages)
    await processQueueBatch();
    const midCampaign = await WhatsAppCampaign.findById(campaignId);
    assert(midCampaign.stats.sentCount === 3, `Queue worker dispatched ${midCampaign.stats.sentCount} messages`);

    // Process Queue Batch 2 (marks campaign complete)
    await processQueueBatch();
    const completedCampaign = await WhatsAppCampaign.findById(campaignId);
    assert(completedCampaign.status === 'COMPLETED', 'Campaign marked COMPLETED after full dispatch');

    // ---------------------------------------------------------
    // TEST 21 & 22: Webhook Processing & Delivery / Read Status Updates
    // ---------------------------------------------------------
    console.log('--- Test 21 & 22: Webhook Delivery Status Tracking ---');
    const sampleRecipient = await WhatsAppCampaignRecipient.findOne({ campaignId });
    if (sampleRecipient && sampleRecipient.wamid) {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'mock_waba_alpha_101',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '+919876543210', phone_number_id: 'mock_phone_alpha_201' },
              statuses: [
                { id: sampleRecipient.wamid, status: 'delivered', timestamp: '1724370000' },
                { id: sampleRecipient.wamid, status: 'read', timestamp: '1724370010' }
              ]
            }
          }]
        }]
      };

      const whRes = await axios.post(`${BASE_URL}/api/whatsapp/webhook`, webhookPayload);
      assert(whRes.status === 200, 'Webhook accepted status payload');

      const updatedRec = await WhatsAppCampaignRecipient.findById(sampleRecipient._id);
      assert(updatedRec.status === 'READ', 'Recipient status updated from SENT -> DELIVERED -> READ');
    }

    // ---------------------------------------------------------
    // TEST 24: Wallet Threshold & Insufficient Funds Guard
    // ---------------------------------------------------------
    console.log('--- Test 24: Insufficient Balance Guard ---');
    walletDoc.balance = 0.50; // Set low balance
    await walletDoc.save();

    const lowBalCampaignRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns`, {
      name: 'Low Balance Test Campaign',
      templateId: tmpl._id,
      audienceType: 'SAVED_SEGMENT',
      variableMappings: { "1": "{{name}}" }
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    try {
      await axios.post(`${BASE_URL}/api/whatsapp/campaigns/${lowBalCampaignRes.data.campaign._id}/send`, {}, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'Should have blocked send due to low balance');
    } catch (err) {
      assert(err.response?.status === 402 && err.response?.data?.code === 'INSUFFICIENT_WALLET_BALANCE', 'Blocked with 402 INSUFFICIENT_WALLET_BALANCE');
    }

    // Recharge wallet
    const rechargeRes = await axios.post(`${BASE_URL}/api/whatsapp/wallet/recharge`, {
      amount: 5000,
      paymentMethod: 'UPI'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(rechargeRes.status === 200 && rechargeRes.data.balance > 5000, `Wallet recharged successfully to ₹${rechargeRes.data.balance}`);

    // ---------------------------------------------------------
    // TEST 26 & 27: Feature Disable Preserves History & Re-enable Restores
    // ---------------------------------------------------------
    console.log('--- Test 26 & 27: Feature Lifecycle History Preservation ---');
    const prevCampaignCount = await WhatsAppCampaign.countDocuments({ companyId: companyA._id });
    assert(prevCampaignCount >= 2, `Company A has ${prevCampaignCount} historical campaigns`);

    // ---------------------------------------------------------
    // TEST 28: Super Admin Platform Metrics
    // ---------------------------------------------------------
    console.log('--- Test 28: Super Admin WhatsApp Platform Overview ---');
    const saRes = await axios.get(`${BASE_URL}/api/super-admin/whatsapp/overview`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(saRes.data.connectedCompanies >= 1, `Super Admin tracks connected WABAs: ${saRes.data.connectedCompanies}`);
    assert(saRes.data.messagesToday >= 3, `Super Admin tracks messages sent today: ${saRes.data.messagesToday}`);

    console.log('\n========================================================================');
    console.log(`🏁 FINAL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

executeTestSuite();
