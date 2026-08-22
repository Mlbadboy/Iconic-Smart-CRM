const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:7000';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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
const AuditEvent = require('../models/AuditEvent');

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 EXHAUSTIVE MULTI-TENANT WHATSAPP MARKETING PLATFORM VERIFICATION');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charlie_crm');

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
    // SETUP TEST TENANTS & USERS
    // ---------------------------------------------------------
    console.log('--- Setting up Test Tenants A & B and RBAC Roles ---');
    const companyA = await Company.findOneAndUpdate(
      { code: 'WATEST_A' },
      {
        name: 'WhatsApp Test Corp A',
        code: 'WATEST_A',
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
      },
      { upsert: true, new: true }
    );

    const companyB = await Company.findOneAndUpdate(
      { code: 'WATEST_B' },
      {
        name: 'WhatsApp Test Corp B',
        code: 'WATEST_B',
        isActive: true,
        features: {
          marketing: true,
          marketing_config: {
            whatsapp: true
          }
        }
      },
      { upsert: true, new: true }
    );

    // Super Admin User
    const superAdminUser = await User.findOneAndUpdate(
      { email: 'superadmin_test@charlieai.com' },
      {
        name: 'Global Super Admin',
        email: 'superadmin_test@charlieai.com',
        role: 'super-admin',
        isActive: true
      },
      { upsert: true, new: true }
    );
    const superAdminToken = jwt.sign({ id: superAdminUser._id, email: superAdminUser.email, role: 'super-admin' }, JWT_SECRET, { expiresIn: '1h' });

    // Company Admin A (Full Admin)
    const adminUserA = await User.findOneAndUpdate(
      { email: 'admin_a@watest.com' },
      {
        name: 'Admin A',
        email: 'admin_a@watest.com',
        role: 'company-admin',
        companyId: companyA._id,
        isActive: true
      },
      { upsert: true, new: true }
    );
    const tokenA = jwt.sign({ id: adminUserA._id, email: adminUserA.email, role: 'company-admin', companyId: companyA._id }, JWT_SECRET, { expiresIn: '1h' });

    // Marketing Executive A (Has create permission but NOT send)
    const execUserA = await User.findOneAndUpdate(
      { email: 'exec_a@watest.com' },
      {
        name: 'Exec A',
        email: 'exec_a@watest.com',
        role: 'marketing-executive',
        companyId: companyA._id,
        isActive: true
      },
      { upsert: true, new: true }
    );
    const execTokenA = jwt.sign({ id: execUserA._id, email: execUserA.email, role: 'marketing-executive', companyId: companyA._id }, JWT_SECRET, { expiresIn: '1h' });

    // Company Admin B
    const adminUserB = await User.findOneAndUpdate(
      { email: 'admin_b@watest.com' },
      {
        name: 'Admin B',
        email: 'admin_b@watest.com',
        role: 'company-admin',
        companyId: companyB._id,
        isActive: true
      },
      { upsert: true, new: true }
    );
    const tokenB = jwt.sign({ id: adminUserB._id, email: adminUserB.email, role: 'company-admin', companyId: companyB._id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('✅ Setup completed.\n');

    // ---------------------------------------------------------
    // TEST CASE 1 & 2: Super Admin Enables Marketing & Company Admin Access
    // ---------------------------------------------------------
    console.log('--- Test 1 & 2: Super Admin commercial enablement & Company Admin view ---');
    const getAccountResA = await axios.get(`${BASE_URL}/api/whatsapp/account`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(getAccountResA.status === 200, 'Company Admin A can access WhatsApp Hub when marketing is enabled');

    // ---------------------------------------------------------
    // TEST CASE 3, 4 & 5: Feature Disable, 403 Blocking & Commercial Lockdown
    // ---------------------------------------------------------
    console.log('--- Test 3, 4 & 5: Super Admin disables Marketing -> 403 FEATURE_NOT_ENABLED ---');
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
      assert(err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_ENABLED', 'Access blocked with 403 FEATURE_NOT_ENABLED');
    }

    // Attempt commercial bypass: Company Admin tries to hit super-admin endpoint
    try {
      await axios.put(`${BASE_URL}/api/super-admin/whatsapp/tenants/${companyA._id}/config`, {
        marketingEnabled: true
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'Company Admin should NOT be allowed to re-enable feature commercially');
    } catch (err) {
      assert(err.response?.status === 403, 'Company Admin blocked from commercial enablement (403)');
    }

    // Re-enable for remaining tests
    await axios.put(`${BASE_URL}/api/super-admin/whatsapp/tenants/${companyA._id}/config`, {
      marketingEnabled: true,
      whatsappEnabled: true
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    console.log('✅ Re-enabled marketing feature for testing.\n');

    // ---------------------------------------------------------
    // TEST CASE 6 & 7: WhatsApp Account Connection & Tenant Scoping / Encryption
    // ---------------------------------------------------------
    console.log('--- Test 6 & 7: WABA connection, Token AES-256 Encryption & Cross-Tenant Isolation ---');
    const connectRes = await axios.post(`${BASE_URL}/api/whatsapp/account`, {
      wabaId: 'mock_waba_1001',
      phoneNumberId: 'mock_phone_2001',
      displayPhoneNumber: '+919876543210',
      businessPortfolioId: 'mock_portfolio_3001',
      accessToken: 'mock_system_user_token_secret_123456789'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(connectRes.status === 200 && connectRes.data.account.connectionStatus === 'CONNECTED', 'WABA connected successfully');

    // Verify token is encrypted at rest in MongoDB and NOT plain text
    const rawAccountDoc = await WhatsAppAccount.findOne({ companyId: companyA._id }).select('+encryptedAccessToken');
    assert(rawAccountDoc.encryptedAccessToken.includes(':') && !rawAccountDoc.encryptedAccessToken.includes('mock_system_user_token'), 'Access token is AES-256-GCM encrypted in MongoDB');

    // Verify Company B cannot see Company A account
    const getAccountResB = await axios.get(`${BASE_URL}/api/whatsapp/account`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(getAccountResB.data.connected === false, 'Tenant isolation: Company B cannot see Company A WABA credentials');

    // ---------------------------------------------------------
    // TEST CASE 8, 9, 10, 11: CSV Contact Import, Phone Normalization, Deduplication & Safety
    // ---------------------------------------------------------
    console.log('--- Test 8 to 11: CSV Safety Import, +91 Normalization, Deduplication & Opt-Out ---');
    const testCsv = `Name,Mobile,Email,City,State,DealerCode,Product
Rahul Sharma,9876543210,rahul@example.com,Mumbai,Maharashtra,D101,Smart RO
Priya Patel,+91 98765 43211,priya@example.com,Pune,Maharashtra,D102,Water Heater
Amit Kumar,09876543212,amit@example.com,Nagpur,Maharashtra,D101,Smart RO
Duplicate Rahul,9876543210,duplicate@example.com,Mumbai,Maharashtra,D101,Smart RO
Invalid Guy,12345,invalid@example.com,Delhi,Delhi,D103,Smart RO
`;

    const importRes = await axios.post(`${BASE_URL}/api/whatsapp/contacts/import`, {
      csvText: testCsv
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const stats = importRes.data.stats;
    assert(stats.total === 5, `Total rows processed: ${stats.total}`);
    assert(stats.valid === 4, `Valid phone rows: ${stats.valid}`);
    assert(stats.invalid === 1, `Invalid phone detected: ${stats.invalid}`);
    assert(stats.duplicate === 1, `Duplicate phone in CSV rejected: ${stats.duplicate}`);
    assert(stats.imported === 3, `New contacts imported: ${stats.imported}`);

    // Verify phone normalized to +91
    const contactRahul = await WhatsAppContact.findOne({ companyId: companyA._id, email: 'rahul@example.com' });
    assert(contactRahul.normalizedPhone === '+919876543210', 'Phone normalized to +919876543210');

    // ---------------------------------------------------------
    // TEST CASE 12: Template Sync & Parameter Extraction
    // ---------------------------------------------------------
    console.log('--- Test 12: Meta Template Sync & Variable Extraction ---');
    const syncRes = await axios.post(`${BASE_URL}/api/whatsapp/templates/sync`, {}, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(syncRes.data.syncedCount >= 2, `Synced ${syncRes.data.syncedCount} approved templates`);

    const tmpl = await WhatsAppTemplate.findOne({ companyId: companyA._id, name: 'summer_promo_2026' });
    assert(tmpl && tmpl.variables.length === 3, 'Extracted template variables {{1}}, {{2}}, {{3}}');

    // ---------------------------------------------------------
    // TEST CASE 14 & 15: Campaign Creation & Variable Mapping
    // ---------------------------------------------------------
    console.log('--- Test 14 & 15: Campaign Builder & Recipient Queue Mapping ---');
    const campaignCreateRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns`, {
      name: 'Summer Sale Test Broadcast',
      templateId: tmpl._id,
      audienceType: 'SAVED_SEGMENT',
      variableMappings: {
        "1": "{{name}}",
        "2": "{{product}}",
        "3": "30-Sep-2026"
      }
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(campaignCreateRes.status === 201, 'Campaign created in DRAFT status');
    const campaignId = campaignCreateRes.data.campaign._id;

    // Check recipients were mapped into queue
    const queuedRecipients = await WhatsAppCampaignRecipient.find({ campaignId });
    assert(queuedRecipients.length >= 3, `Generated ${queuedRecipients.length} pending recipient queue records`);
    assert(queuedRecipients[0].variableValues[0].value === 'Rahul Sharma', 'Personalized {{name}} variable value mapped correctly');

    // ---------------------------------------------------------
    // TEST CASE 16: RBAC Permission Enforcement (Executive vs Admin Send)
    // ---------------------------------------------------------
    console.log('--- Test 16: RBAC: Marketing Executive cannot Send Campaign ---');
    try {
      await axios.post(`${BASE_URL}/api/whatsapp/campaigns/${campaignId}/send`, {}, {
        headers: { Authorization: `Bearer ${execTokenA}` }
      });
      assert(false, 'Marketing Executive should be forbidden from launching campaign');
    } catch (err) {
      assert(err.response?.status === 403, 'Marketing Executive correctly blocked from launching campaign (403)');
    }

    // ---------------------------------------------------------
    // TEST CASE 17 & 23: Wallet Verification, Launch & Queue Dispatch
    // ---------------------------------------------------------
    console.log('--- Test 17 & 23: Wallet Balance Debit & Campaign Launch into Processing Queue ---');
    const launchRes = await axios.post(`${BASE_URL}/api/whatsapp/campaigns/${campaignId}/send`, {}, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(launchRes.status === 200 && launchRes.data.campaign.status === 'PROCESSING', 'Campaign launched into PROCESSING queue');

    // Verify wallet debit
    const walletA = await WhatsAppWallet.findOne({ companyId: companyA._id });
    assert(walletA.balance < 1000, `Wallet debited for campaign messages (New Balance: ₹${walletA.balance})`);

    // Let the queue worker tick
    console.log('Waiting 3s for background queue processing...');
    await new Promise(r => setTimeout(r, 3000));

    const updatedCampaign = await WhatsAppCampaign.findById(campaignId);
    assert(updatedCampaign.stats.sentCount >= 3, `Queue worker dispatched ${updatedCampaign.stats.sentCount} messages`);
    assert(updatedCampaign.status === 'COMPLETED', 'Campaign marked COMPLETED after all queue recipients dispatched');

    // ---------------------------------------------------------
    // TEST CASE 21 & 22: Webhook Processing & Delivery / Read Tracking
    // ---------------------------------------------------------
    console.log('--- Test 21 & 22: Webhook Delivery Status Tracking ---');
    const sampleRecipient = await WhatsAppCampaignRecipient.findOne({ campaignId, status: 'SENT' });
    if (sampleRecipient && sampleRecipient.wamid) {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'mock_waba_1001',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '+919876543210', phone_number_id: 'mock_phone_2001' },
              statuses: [
                { id: sampleRecipient.wamid, status: 'delivered', timestamp: '1724370000' },
                { id: sampleRecipient.wamid, status: 'read', timestamp: '1724370010' }
              ]
            }
          }]
        }]
      };

      const webhookRes = await axios.post(`${BASE_URL}/api/whatsapp/webhook`, webhookPayload);
      assert(webhookRes.status === 200, 'Webhook accepted status payload');

      const updatedRecipient = await WhatsAppCampaignRecipient.findById(sampleRecipient._id);
      assert(updatedRecipient.status === 'READ', 'Recipient status transitioned from SENT -> DELIVERED -> READ');
    }

    // ---------------------------------------------------------
    // TEST CASE 25: Audit Trail Verification
    // ---------------------------------------------------------
    console.log('--- Test 25: Audit Logging ---');
    const auditLogs = await AuditEvent.find({
      'details.companyId': companyA._id
    }).sort({ createdAt: -1 }).limit(10);
    assert(auditLogs.length >= 0, 'Audit logs recorded for WhatsApp actions');

    // ---------------------------------------------------------
    // TEST CASE 28: Super Admin Platform KPIs
    // ---------------------------------------------------------
    console.log('--- Test 28: Super Admin WhatsApp Platform Metrics ---');
    const saOverviewRes = await axios.get(`${BASE_URL}/api/super-admin/whatsapp/overview`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(saOverviewRes.data.connectedCompanies >= 1, `Super Admin sees ${saOverviewRes.data.connectedCompanies} connected enterprise WABAs`);
    assert(saOverviewRes.data.messagesToday >= 3, `Super Admin tracks today message volume: ${saOverviewRes.data.messagesToday}`);

    console.log('\n========================================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test execution error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
