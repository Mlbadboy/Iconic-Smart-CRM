const express = require('express');
const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SerialRegistry = require('../models/SerialRegistry');
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const { validateSubdomain, invalidateTenantCache } = require('../services/tenantResolver');
const { uploadAsset, getAssetUrl } = require('../services/storageService');
const logger = require('../services/logger');

const router = express.Router();

const isSuperAdminUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'super-admin' || role === 'superadmin';
};

// 1. List companies (Super Admin gets all, Company Admin gets their assigned company)
router.get('/', auth, async (req, res) => {
  try {
    if (isSuperAdminUser(req.user)) {
      const companies = await Company.find({}).sort({ createdAt: -1 }).populate('primaryAdminId', 'name email').lean();
      return res.json(companies);
    }

    // Regular users / Company Admins can only view their own assigned company
    if (req.user.companyId) {
      const company = await Company.findById(req.user.companyId).populate('primaryAdminId', 'name email').lean();
      return res.json(company ? [company] : []);
    }

    res.json([]);
  } catch (err) {
    logger.error('Error listing companies:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get single company details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Non-super-admins cannot view other companies
    if (!isSuperAdminUser(req.user) && String(req.user.companyId) !== String(id)) {
      return res.status(403).json({ error: 'Access denied to this company tenant' });
    }

    const company = await Company.findById(id).populate('primaryAdminId', 'name email phone role').lean();
    if (!company) return res.status(404).json({ error: 'Company not found' });

    res.json(company);
  } catch (err) {
    logger.error('Error getting company:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Create a new Company + initial Company Admin (Super Admin only)
router.post('/', auth, uploadAsset.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), async (req, res) => {
  try {
    if (!isSuperAdminUser(req.user)) {
      return res.status(403).json({ error: 'Only Super Administrators can create new companies' });
    }

    const {
      name,
      displayName,
      code,
      subdomain,
      contactEmail,
      contactPhone,
      address,
      settings,
      branding,
      billing,
      adminName,
      adminEmail,
      adminPassword
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Company name and unique code are required' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const existingCode = await Company.findOne({ code: normalizedCode });
    if (existingCode) {
      return res.status(409).json({ error: `Company with code '${normalizedCode}' already exists` });
    }

    // Subdomain validation
    let cleanSubdomain = null;
    if (subdomain) {
      const validation = validateSubdomain(subdomain);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.reason });
      }
      const existingSubdomain = await Company.findOne({ subdomain: validation.clean });
      if (existingSubdomain) {
        return res.status(409).json({ error: `Subdomain '${validation.clean}' is already in use by another tenant` });
      }
      cleanSubdomain = validation.clean;
    }

    // Parse branding if sent as JSON string
    let parsedBranding = {};
    if (typeof branding === 'string') {
      try { parsedBranding = JSON.parse(branding); } catch (e) {}
    } else if (typeof branding === 'object' && branding !== null) {
      parsedBranding = branding;
    }

    // Attach uploaded logo/favicon
    if (req.files?.logo?.[0]) {
      parsedBranding.logo = getAssetUrl(req.files.logo[0].filename);
    }
    if (req.files?.favicon?.[0]) {
      parsedBranding.favicon = getAssetUrl(req.files.favicon[0].filename);
    }

    // Parse settings and billing
    let parsedSettings = settings;
    if (typeof settings === 'string') {
      try { parsedSettings = JSON.parse(settings); } catch (e) {}
    }

    let parsedBilling = billing;
    if (typeof billing === 'string') {
      try { parsedBilling = JSON.parse(billing); } catch (e) {}
    }

    let parsedAddress = address;
    if (typeof address === 'string') {
      try { parsedAddress = JSON.parse(address); } catch (e) {}
    }

    const company = new Company({
      name: name.trim(),
      displayName: displayName?.trim() || name.trim(),
      code: normalizedCode,
      subdomain: cleanSubdomain,
      logo: parsedBranding.logo || null,
      branding: parsedBranding,
      billing: parsedBilling || { plan: 'STARTER', subscriptionStatus: 'ACTIVE' },
      status: 'ACTIVE',
      contactEmail: contactEmail?.trim()?.toLowerCase(),
      contactPhone,
      address: parsedAddress,
      settings: parsedSettings || {
        defaultGstRate: 18,
        invoicePrefix: `${normalizedCode}-INV`,
        orderPrefix: `${normalizedCode}-ORD`,
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

    await company.save();

    // Optionally create initial Company Admin
    let createdAdmin = null;
    if (adminEmail && adminPassword) {
      const normalizedEmail = adminEmail.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        createdAdmin = new User({
          name: adminName || `${name} Admin`,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'company-admin',
          companyId: company._id,
          scopeType: 'ALL'
        });
        await createdAdmin.save();

        company.primaryAdminId = createdAdmin._id;
        await company.save();
      }
    }

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.create',
      entity: 'Company',
      entityId: company._id,
      newValue: { name: company.name, code: company.code, subdomain: company.subdomain }
    });

    invalidateTenantCache(company.subdomain);

    res.status(201).json({
      message: 'Company tenant created successfully',
      company,
      admin: createdAdmin ? { id: createdAdmin._id, email: createdAdmin.email } : null
    });
  } catch (err) {
    logger.error('Error creating company:', err);
    res.status(400).json({ error: err.message });
  }
});

// 4. Update Company Details (Super Admin or Company Admin)
router.put('/:id', auth, uploadAsset.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdminUser(req.user) && (String(req.user.companyId) !== String(id) || !hasPermission(req.user, 'company.manage'))) {
      return res.status(403).json({ error: 'Permission denied to modify company settings' });
    }

    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const {
      name,
      displayName,
      subdomain,
      contactEmail,
      contactPhone,
      address,
      settings,
      branding,
      billing
    } = req.body;

    if (name) company.name = name.trim();
    if (displayName !== undefined) company.displayName = displayName?.trim();
    
    // Subdomain modification (Super Admin only)
    if (subdomain !== undefined && subdomain !== company.subdomain) {
      if (!isSuperAdminUser(req.user)) {
        return res.status(403).json({ error: 'Only Super Administrators can modify tenant subdomains' });
      }
      if (subdomain) {
        const validation = validateSubdomain(subdomain);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.reason });
        }
        const existing = await Company.findOne({ subdomain: validation.clean, _id: { $ne: company._id } });
        if (existing) {
          return res.status(409).json({ error: `Subdomain '${validation.clean}' is already taken` });
        }
        invalidateTenantCache(company.subdomain);
        company.subdomain = validation.clean;
      } else {
        company.subdomain = null;
      }
    }

    // Branding updates
    let parsedBranding = branding;
    if (typeof branding === 'string') {
      try { parsedBranding = JSON.parse(branding); } catch (e) {}
    }
    if (parsedBranding) {
      company.branding = { ...(company.branding || {}), ...parsedBranding };
    }

    // File attachments
    if (req.files?.logo?.[0]) {
      const logoUrl = getAssetUrl(req.files.logo[0].filename);
      company.logo = logoUrl;
      if (!company.branding) company.branding = {};
      company.branding.logo = logoUrl;
    }
    if (req.files?.favicon?.[0]) {
      const faviconUrl = getAssetUrl(req.files.favicon[0].filename);
      if (!company.branding) company.branding = {};
      company.branding.favicon = faviconUrl;
    }

    if (contactEmail) company.contactEmail = contactEmail.trim().toLowerCase();
    if (contactPhone !== undefined) company.contactPhone = contactPhone;
    
    let parsedAddress = address;
    if (typeof address === 'string') {
      try { parsedAddress = JSON.parse(address); } catch (e) {}
    }
    if (parsedAddress) company.address = { ...company.address, ...parsedAddress };

    let parsedSettings = settings;
    if (typeof settings === 'string') {
      try { parsedSettings = JSON.parse(settings); } catch (e) {}
    }
    if (parsedSettings) company.settings = { ...company.settings, ...parsedSettings };

    // Billing update (Super Admin only)
    if (billing && isSuperAdminUser(req.user)) {
      let parsedBilling = billing;
      if (typeof billing === 'string') {
        try { parsedBilling = JSON.parse(billing); } catch (e) {}
      }
      company.billing = { ...(company.billing || {}), ...parsedBilling };
    }

    await company.save();
    invalidateTenantCache(company.subdomain);
    invalidateTenantCache(company._id);

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.update',
      entity: 'Company',
      entityId: company._id,
      newValue: { name: company.name, subdomain: company.subdomain, branding: company.branding }
    });

    res.json({ message: 'Company updated successfully', company });
  } catch (err) {
    logger.error('Error updating company:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Upload Company Logo directly
router.post('/:id/logo', auth, uploadAsset.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdminUser(req.user) && (String(req.user.companyId) !== String(id) || !hasPermission(req.user, 'company.manage'))) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Logo image file is required' });
    }

    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const logoUrl = getAssetUrl(req.file.filename);
    company.logo = logoUrl;
    if (!company.branding) company.branding = {};
    company.branding.logo = logoUrl;

    await company.save();
    invalidateTenantCache(company.subdomain);

    res.json({ message: 'Logo uploaded successfully', logoUrl, company });
  } catch (err) {
    logger.error('Error uploading logo:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Upload Company Favicon directly
router.post('/:id/favicon', auth, uploadAsset.single('favicon'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdminUser(req.user) && (String(req.user.companyId) !== String(id) || !hasPermission(req.user, 'company.manage'))) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Favicon image file is required' });
    }

    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const faviconUrl = getAssetUrl(req.file.filename);
    if (!company.branding) company.branding = {};
    company.branding.favicon = faviconUrl;

    await company.save();
    invalidateTenantCache(company.subdomain);

    res.json({ message: 'Favicon uploaded successfully', faviconUrl, company });
  } catch (err) {
    logger.error('Error uploading favicon:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Update Organizational Hierarchy Structure
router.put('/:id/hierarchy', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdminUser(req.user) && (String(req.user.companyId) !== String(id) || !hasPermission(req.user, 'company.manage'))) {
      return res.status(403).json({ error: 'Permission denied to modify organization structure' });
    }

    const { hierarchyConfig } = req.body;
    if (!hierarchyConfig) return res.status(400).json({ error: 'hierarchyConfig is required' });

    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    company.hierarchyConfig = hierarchyConfig;
    await company.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.hierarchy.update',
      entity: 'Company',
      entityId: company._id
    });

    res.json({ message: 'Organizational hierarchy updated', hierarchyConfig: company.hierarchyConfig });
  } catch (err) {
    logger.error('Error updating hierarchy:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Change Lifecycle Status (Super Admin only: PROVISIONING | ACTIVE | SUSPENDED | DEACTIVATED)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (!isSuperAdminUser(req.user)) {
      return res.status(403).json({ error: 'Only Super Administrators can change company status' });
    }

    const { id } = req.params;
    const { status, isActive } = req.body;

    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const allowedStatuses = ['PROVISIONING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
    if (status) {
      const normalized = status.toUpperCase().trim();
      if (!allowedStatuses.includes(normalized)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
      }
      company.status = normalized;
      company.isActive = (normalized === 'ACTIVE');
    } else if (isActive !== undefined) {
      company.isActive = Boolean(isActive);
      company.status = company.isActive ? 'ACTIVE' : 'DEACTIVATED';
    }

    await company.save();
    invalidateTenantCache(company.subdomain);
    invalidateTenantCache(company._id);

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'company.status.change',
      entity: 'Company',
      entityId: company._id,
      newValue: { status: company.status, isActive: company.isActive }
    });

    res.json({ message: `Company status changed to ${company.status}`, company });
  } catch (err) {
    logger.error('Error changing company status:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Get Company Operational Stats Overview
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdminUser(req.user) && String(req.user.companyId) !== String(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [totalUsers, totalProducts, totalOrders, totalUnits] = await Promise.all([
      User.countDocuments({ companyId: id }),
      Product.countDocuments({ companyId: id }),
      Order.countDocuments({ companyId: id }),
      SerialRegistry.countDocuments({ companyId: id })
    ]);

    res.json({
      companyId: id,
      totalUsers,
      totalProducts,
      totalOrders,
      totalUnits
    });
  } catch (err) {
    logger.error('Error getting company stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
