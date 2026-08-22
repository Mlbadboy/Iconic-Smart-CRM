const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Retailer = require('../models/Retailer');
const SerialRegistry = require('../models/SerialRegistry');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceCenter = require('../models/ServiceCenter');
const StoreVisit = require('../models/StoreVisit');
const Attendance = require('../models/Attendance');
const Dispatch = require('../models/Dispatch');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const MarketingAsset = require('../models/MarketingAsset');
const ApiKey = require('../models/ApiKey');
const Webhook = require('../models/Webhook');
const AuditEvent = require('../models/AuditEvent');
const logger = require('../services/logger');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/iconic-crm?authSource=admin';

async function migrateToMultiTenant() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      logger.info('Connected to MongoDB for Multi-Tenant Migration');
    }

    // 1. Find or create default Primary Company
    let primaryCompany = await Company.findOne({ code: { $in: ['CHARLIES_PRIMARY', 'ICONIC_PRIMARY'] } });
    if (!primaryCompany) {
      logger.info("Creating default primary company: Charlie's Primary (CHARLIES_PRIMARY)...");
      primaryCompany = new Company({
        name: "Charlie's Primary",
        code: 'CHARLIES_PRIMARY',
        isActive: true,
        contactEmail: 'admin@charliescrm.com',
        settings: {
          defaultGstRate: 18,
          invoicePrefix: 'INV',
          orderPrefix: 'ORD',
          defaultWarrantyMonths: 12
        },
        hierarchyConfig: {
          levels: [
            { levelNumber: 1, name: 'Zone', allowedChildTypes: ['REGION'] },
            { levelNumber: 2, name: 'Region', allowedChildTypes: ['DISTRIBUTOR'] },
            { levelNumber: 3, name: 'Distributor', allowedChildTypes: ['DEALER'] },
            { levelNumber: 4, name: 'Dealer', allowedChildTypes: ['RETAILER'] },
            { levelNumber: 5, name: 'Retailer', allowedChildTypes: [] }
          ],
          nodes: []
        }
      });
      await primaryCompany.save();
      logger.info(`Default Company created with ID: ${primaryCompany._id}`);
    }

    const companyId = primaryCompany._id;

    // 2. Ensure Default System Users with exact credentials exist
    const defaultAccounts = [
      {
        name: 'Super Administrator',
        email: 'superadmin@charlieai.com',
        passwordRaw: 'Admin@123456',
        role: 'super-admin',
        scopeType: 'ALL'
      },
      {
        name: 'Super Administrator (India)',
        email: 'superadmin@charlieai.in',
        passwordRaw: 'Admin@123456',
        role: 'super-admin',
        scopeType: 'ALL'
      },
      {
        name: 'Primary Company Admin',
        email: 'admin@charlieai.com',
        passwordRaw: 'admin123',
        role: 'company-admin',
        companyId: companyId,
        scopeType: 'ALL'
      },
      {
        name: 'Primary Company Admin (India)',
        email: 'admin@charlieai.in',
        passwordRaw: 'admin123',
        role: 'company-admin',
        companyId: companyId,
        scopeType: 'ALL'
      },
      {
        name: 'Sales Manager',
        email: 'sales@charlieai.com',
        passwordRaw: 'sales123',
        role: 'sales-manager',
        companyId: companyId,
        scopeType: 'ALL'
      },
      {
        name: 'Sales Manager (India)',
        email: 'sales@charlieai.in',
        passwordRaw: 'sales123',
        role: 'sales-manager',
        companyId: companyId,
        scopeType: 'ALL'
      },
      {
        name: 'Service Agent',
        email: 'service@charlieai.com',
        passwordRaw: 'service123',
        role: 'service-agent',
        companyId: companyId,
        scopeType: 'ALL'
      },
      {
        name: 'Service Agent (India)',
        email: 'service@charlieai.in',
        passwordRaw: 'service123',
        role: 'service-agent',
        companyId: companyId,
        scopeType: 'ALL'
      }
    ];

    for (const acc of defaultAccounts) {
      let existing = await User.findOne({ email: acc.email.toLowerCase() });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(acc.passwordRaw, 10);
        await User.create({
          name: acc.name,
          email: acc.email.toLowerCase(),
          password: hashedPassword,
          role: acc.role,
          companyId: acc.companyId || null,
          scopeType: acc.scopeType || 'ALL',
          status: 'ACTIVE',
          isActive: true
        });
        logger.info(`✅ Seeded default user: ${acc.email} (${acc.role})`);
      }
    }

    // 3. Migrate all operational collections to attach companyId if missing
    const collectionsToMigrate = [
      { model: User, name: 'Users', filter: { companyId: { $exists: false } } },
      { model: Product, name: 'Products', filter: { companyId: { $exists: false } } },
      { model: Order, name: 'Orders', filter: { companyId: { $exists: false } } },
      { model: Retailer, name: 'Retailers/Dealers/Distributors', filter: { companyId: { $exists: false } } },
      { model: SerialRegistry, name: 'SerialRegistry', filter: { companyId: { $exists: false } } },
      { model: ServiceRequest, name: 'ServiceRequests', filter: { companyId: { $exists: false } } },
      { model: ServiceCenter, name: 'ServiceCenters', filter: { companyId: { $exists: false } } },
      { model: StoreVisit, name: 'StoreVisits', filter: { companyId: { $exists: false } } },
      { model: Attendance, name: 'Attendance', filter: { companyId: { $exists: false } } },
      { model: Dispatch, name: 'Dispatches', filter: { companyId: { $exists: false } } },
      { model: Lead, name: 'Leads', filter: { companyId: { $exists: false } } },
      { model: Contact, name: 'Contacts', filter: { companyId: { $exists: false } } },
      { model: Opportunity, name: 'Opportunities', filter: { companyId: { $exists: false } } },
      { model: MarketingAsset, name: 'MarketingAssets', filter: { companyId: { $exists: false } } },
      { model: ApiKey, name: 'ApiKeys', filter: { companyId: { $exists: false } } },
      { model: Webhook, name: 'Webhooks', filter: { companyId: { $exists: false } } },
      { model: AuditEvent, name: 'AuditEvents', filter: { companyId: { $exists: false } } }
    ];

    for (const item of collectionsToMigrate) {
      let result;
      if (item.name === 'AuditEvents') {
        result = await item.model.collection.updateMany(
          { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
          { $set: { companyId } }
        );
      } else {
        result = await item.model.updateMany(
          { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
          { $set: { companyId } }
        );
      }
      if (result && (result.matchedCount > 0 || result.modifiedCount > 0)) {
        logger.info(`Migrated ${result.modifiedCount || result.matchedCount} ${item.name} records to Company: ${primaryCompany.name}`);
      }
    }

    // 4. In development/testing, seed default demo product and serial registry entry
    if (process.env.NODE_ENV !== 'production') {
      let demoProd = await Product.findOne({ companyId, sku: '2552' });
      if (!demoProd) {
        demoProd = await Product.create({
          companyId,
          productId: 'ICON-2552-32INC',
          sku: '2552',
          productCode: '2552',
          materialCode: 'UTIXK',
          model: '32inc',
          name: '32INC',
          price: 12990,
          mrp: 14990,
          brand: 'ICONICSMART',
          category: 'Led',
          active: true
        });
        logger.info('Created default demo product: 2552 / UTIXK');
      }

      let demoSerial = await SerialRegistry.findOne({ companyId, serialNumber: 'IXHFJDGHH' });
      if (!demoSerial) {
        demoSerial = await SerialRegistry.create({
          companyId,
          productId: demoProd._id,
          materialCode: 'UTIXK',
          serialNumber: 'IXHFJDGHH',
          dealerCode: '55262',
          distributorCode: '27858',
          region: 'West',
          territory: 'UP',
          status: 'IN_STOCK',
          registrationStatus: 'REGISTERED',
          activationStatus: 'ACTIVE'
        });
        logger.info('Created default demo serial: IXHFJDGHH (UTIXK / 55262)');
      }
    }

    // 5. Seed permanent test API keys
    const adminUser = await User.findOne({ companyId });
    const defaultKeys = [
      'ik_bd3a34d51bcb7057dbdae548c35c4cbde62a23fbf456e478',
      'ik_7dc20ec48ead2c4f891618dfa4587ca37aab2b4af73b0290',
      'vvapl_api_eLLxRPZqiNQsCJuyLUbiNP:4f73f874f67b31d25f2dbf6d2205283c70368991',
      'ik_demo_partner_master_key_12345'
    ];

    for (const keyStr of defaultKeys) {
      const existingKey = await ApiKey.findOne({ key: keyStr });
      if (!existingKey) {
        await ApiKey.create({
          key: keyStr,
          name: 'Partner Serial Validation Gateway',
          feature: 'Serial Number Validation',
          clientName: 'Bajaj Finance Partner',
          partnerType: 'INTEGRATOR',
          companyId,
          userId: adminUser?._id,
          permissions: ['product.verify', 'serial_validation.validate'],
          status: 'ACTIVE',
          active: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
      }
    }

    logger.info('Multi-Tenant migration completed successfully!');
    return { success: true, companyId: primaryCompany._id };
  } catch (err) {
    logger.error('Multi-Tenant migration failed:', err);
    throw err;
  }
}

module.exports = { migrateToMultiTenant };

if (require.main === module) {
  migrateToMultiTenant().then(() => {
    logger.info('Migration finished.');
    process.exit(0);
  }).catch((err) => {
    logger.error('Migration error:', err);
    process.exit(1);
  });
}
