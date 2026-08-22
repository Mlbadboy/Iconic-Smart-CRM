const Company = require('../models/Company');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppWallet = require('../models/WhatsAppWallet');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const WhatsAppContact = require('../models/WhatsAppContact');
const { normalizePhone } = require('./whatsAppContactService');
const logger = require('./logger');

/**
 * Analyzes WhatsApp Campaign Preflight before any message or credit is committed
 */
async function analyzeWhatsAppCampaignPreflight(companyId, inputData) {
  const {
    contacts = [],
    templateName,
    mediaUrl = null,
    audienceType = 'CSV_UPLOAD'
  } = inputData;

  const [company, wabaAccount, walletDoc, template] = await Promise.all([
    Company.findById(companyId),
    WhatsAppAccount.findOne({ companyId }),
    WhatsAppWallet.findOne({ companyId }),
    templateName ? WhatsAppTemplate.findOne({ companyId, name: templateName }) : null
  ]);

  if (!company) throw new Error('Company not found');
  if (!wabaAccount || wabaAccount.connectionStatus !== 'CONNECTED') {
    throw new Error('No active WhatsApp Business Account connected for company');
  }

  const ratePerMsg = company.features?.marketing_config?.rate_per_marketing_msg || 0.99;
  const walletBalance = walletDoc ? walletDoc.balance : (wabaAccount.walletBalance || 0);

  let totalRecords = contacts.length;
  let validNumbers = 0;
  let invalidNumbers = 0;
  let duplicateCount = 0;
  let missingNameCount = 0;
  let optedOutCount = 0;

  const seenPhones = new Set();
  const validRecipients = [];
  const invalidRows = [];

  // Query existing opted-out contacts in CRM
  const rawPhones = contacts.map(c => normalizePhone(c.phone || c.mobile || '').normalized).filter(Boolean);
  const optedOutDocs = await WhatsAppContact.find({
    companyId,
    normalizedPhone: { $in: rawPhones },
    whatsappOptIn: false
  }).select('normalizedPhone');
  const optedOutSet = new Set(optedOutDocs.map(d => d.normalizedPhone));

  for (let i = 0; i < contacts.length; i++) {
    const row = contacts[i];
    const rawPhone = row.phone || row.mobile || row.phoneNumber || '';
    const name = row.name || row.customerName || '';
    const normResult = normalizePhone(rawPhone);
    const normalized = normResult.valid ? normResult.normalized : null;

    if (!normalized) {
      invalidNumbers++;
      invalidRows.push({ rowIndex: i + 1, rawPhone, name, reason: 'Invalid phone format (must be +91 E.164)' });
      continue;
    }

    if (seenPhones.has(normalized)) {
      duplicateCount++;
      invalidRows.push({ rowIndex: i + 1, rawPhone, name, reason: 'Duplicate phone number in list' });
      continue;
    }

    seenPhones.add(normalized);

    if (optedOutSet.has(normalized)) {
      optedOutCount++;
      invalidRows.push({ rowIndex: i + 1, rawPhone, name, reason: 'Contact previously opted-out' });
      continue;
    }

    if (!name.trim()) {
      missingNameCount++;
    }

    validNumbers++;
    validRecipients.push({
      phone: normalized,
      name: name.trim() || 'Valued Customer',
      email: row.email || null,
      customVariables: row.customVariables || {}
    });
  }

  const estimatedMessages = validNumbers;
  const estimatedCost = Math.round(estimatedMessages * ratePerMsg * 100) / 100;
  const isWalletSufficient = walletBalance >= estimatedCost;
  const balanceDeficit = isWalletSufficient ? 0 : Math.round((estimatedCost - walletBalance) * 100) / 100;

  return {
    preflightPassed: validNumbers > 0 && isWalletSufficient,
    summary: {
      totalRecords,
      validNumbers,
      invalidNumbers,
      duplicateCount,
      missingNameCount,
      optedOutCount,
      estimatedMessages
    },
    template: template ? {
      name: template.name,
      category: template.category,
      language: template.language,
      bodyText: template.bodyText,
      hasMediaHeader: template.hasMediaHeader || !!mediaUrl
    } : {
      name: templateName || 'Default Marketing Template',
      hasMediaHeader: !!mediaUrl
    },
    financials: {
      ratePerMessage: ratePerMsg,
      estimatedCost,
      walletBalance,
      isWalletSufficient,
      balanceDeficit
    },
    validRecipients,
    invalidRows
  };
}

/**
 * Validates Meta Ad Campaign Preflight before submission
 */
async function analyzeMetaAdPreflight(companyId, adConfig) {
  const company = await Company.findById(companyId);
  if (!company) throw new Error('Company not found');

  const {
    name,
    objective = 'OUTCOME_LEADS',
    budgetType = 'DAILY',
    budgetAmount = 500,
    durationDays = 7,
    targeting = {}
  } = adConfig;

  const monthlyAdLimit = company.features?.marketing_config?.monthly_ad_spend_limit || 100000;
  const totalCampaignBudget = budgetType === 'DAILY' ? (budgetAmount * durationDays) : budgetAmount;

  const isBudgetWithinLimit = totalCampaignBudget <= monthlyAdLimit;

  // Predict reach & benchmark metrics based on budget & targeting
  const estimatedDailyReachMin = Math.round(budgetAmount * 3.5);
  const estimatedDailyReachMax = Math.round(budgetAmount * 8.2);
  const estimatedClicksMin = Math.round(budgetAmount * 0.12);
  const estimatedClicksMax = Math.round(budgetAmount * 0.35);
  const estimatedLeadsMin = Math.round(budgetAmount * 0.015);
  const estimatedLeadsMax = Math.round(budgetAmount * 0.045);

  const warnings = [];
  if (!targeting.locations || targeting.locations.length === 0) {
    warnings.push('No specific geographical targeting specified. Defaulting to nationwide (India).');
  }
  if (!isBudgetWithinLimit) {
    warnings.push(`Campaign budget (₹${totalCampaignBudget}) exceeds tenant monthly limit (₹${monthlyAdLimit}). Super Admin approval required.`);
  }

  return {
    preflightPassed: isBudgetWithinLimit && budgetAmount > 0,
    campaignName: name,
    objective,
    budget: {
      budgetType,
      dailyBudget: budgetType === 'DAILY' ? budgetAmount : Math.round(budgetAmount / durationDays),
      totalBudget: totalCampaignBudget,
      monthlyTenantLimit: monthlyAdLimit,
      isBudgetWithinLimit
    },
    estimates: {
      dailyReachRange: `${estimatedDailyReachMin.toLocaleString()} - ${estimatedDailyReachMax.toLocaleString()} people`,
      dailyClicksRange: `${estimatedClicksMin} - ${estimatedClicksMax} clicks`,
      estimatedLeadsRange: `${estimatedLeadsMin * durationDays} - ${estimatedLeadsMax * durationDays} prospective leads`
    },
    warnings
  };
}

module.exports = {
  analyzeWhatsAppCampaignPreflight,
  analyzeMetaAdPreflight
};
