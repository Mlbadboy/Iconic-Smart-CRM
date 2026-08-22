const Company = require('../models/Company');
const WhatsAppWallet = require('../models/WhatsAppWallet');
const WhatsAppUsage = require('../models/WhatsAppUsage');
const logger = require('./logger');

/**
 * Default base rate cards (configurable by Super Admin)
 */
const DEFAULT_RATES = {
  MARKETING: 0.8631, // Standard Meta rate in India for Marketing
  UTILITY: 0.3500,   // Standard Meta rate for Utility
  AUTHENTICATION: 0.3500,
  SERVICE: 0.0000,   // Free inside 24hr window
  PLATFORM_MARKUP: 0.15 // 15% platform markup
};

/**
 * Retrieves the effective rate card for a company
 */
async function getRateCard(companyId) {
  const company = await Company.findById(companyId).select('features');
  const cfg = company?.features?.marketing_config || {};

  const marketingRate = cfg.rate_per_marketing_msg ?? DEFAULT_RATES.MARKETING;
  const utilityRate = cfg.rate_per_utility_msg ?? DEFAULT_RATES.UTILITY;
  const authRate = cfg.rate_per_auth_msg ?? DEFAULT_RATES.AUTHENTICATION;
  const markup = cfg.platform_fee_markup ?? DEFAULT_RATES.PLATFORM_MARKUP;

  return {
    MARKETING: Number((marketingRate * (1 + markup)).toFixed(4)),
    UTILITY: Number((utilityRate * (1 + markup)).toFixed(4)),
    AUTHENTICATION: Number((authRate * (1 + markup)).toFixed(4)),
    SERVICE: 0.0000,
    monthlyLimit: cfg.monthly_message_limit || 50000,
    dailyLimit: cfg.daily_message_limit || 5000,
    baseRateMarketing: marketingRate,
    markup
  };
}

/**
 * Estimates cost for a campaign before launch
 */
async function estimateCampaignCost(companyId, recipientCount, category = 'MARKETING') {
  const rateCard = await getRateCard(companyId);
  const unitRate = rateCard[category.toUpperCase()] || rateCard.MARKETING;
  const estimatedCost = Number((recipientCount * unitRate).toFixed(2));

  return {
    recipientCount,
    category,
    unitRate,
    estimatedCost,
    currency: 'INR'
  };
}

/**
 * Retrieves or creates a company wallet
 */
async function getOrCreateWallet(companyId) {
  let wallet = await WhatsAppWallet.findOne({ companyId });
  if (!wallet) {
    wallet = new WhatsAppWallet({
      companyId,
      balance: 1000, // Initial testing balance
      currency: 'INR'
    });
    await wallet.save();
  }
  return wallet;
}

/**
 * Validates that the company has enough balance and hasn't exceeded limits
 */
async function validateCampaignBudget(companyId, recipientCount, category = 'MARKETING') {
  const { estimatedCost, unitRate } = await estimateCampaignCost(companyId, recipientCount, category);
  const wallet = await getOrCreateWallet(companyId);

  // Check quota usage for today
  const todayStr = new Date().toISOString().split('T')[0];
  const usageToday = await WhatsAppUsage.findOne({ companyId, date: todayStr });
  const rateCard = await getRateCard(companyId);

  const sentToday = usageToday?.messagesSent || 0;
  if (sentToday + recipientCount > rateCard.dailyLimit) {
    return {
      allowed: false,
      reason: `Daily messaging limit exceeded (${sentToday + recipientCount}/${rateCard.dailyLimit} messages)`,
      code: 'DAILY_LIMIT_EXCEEDED'
    };
  }

  // Check wallet balance
  if (wallet.balance < estimatedCost) {
    return {
      allowed: false,
      reason: `Insufficient WhatsApp Wallet balance. Required: ₹${estimatedCost}, Available: ₹${wallet.balance.toFixed(2)}`,
      code: 'INSUFFICIENT_WALLET_BALANCE',
      required: estimatedCost,
      balance: wallet.balance
    };
  }

  return {
    allowed: true,
    estimatedCost,
    unitRate,
    currentBalance: wallet.balance
  };
}

/**
 * Debits the wallet for campaign dispatches
 */
async function debitWallet(companyId, amount, description, campaignId = null, userId = null) {
  const wallet = await getOrCreateWallet(companyId);
  if (wallet.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  wallet.balance = Number((wallet.balance - amount).toFixed(2));
  wallet.transactions.push({
    type: 'DEBIT',
    amount,
    balanceAfter: wallet.balance,
    description,
    campaignId,
    createdBy: userId
  });

  await wallet.save();
  return wallet;
}

/**
 * Credits the wallet (recharge / adjustment)
 */
async function creditWallet(companyId, amount, description, userId = null) {
  const wallet = await getOrCreateWallet(companyId);
  wallet.balance = Number((wallet.balance + amount).toFixed(2));
  wallet.transactions.push({
    type: 'CREDIT',
    amount,
    balanceAfter: wallet.balance,
    description,
    createdBy: userId
  });

  await wallet.save();
  return wallet;
}

/**
 * Records messaging metrics in daily and monthly buckets
 */
async function recordUsage(companyId, category = 'MARKETING', status = 'SENT', cost = 0) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const monthStr = dateStr.substring(0, 7);

  const updateFields = {
    $inc: {
      totalCost: cost
    }
  };

  if (status === 'SENT') updateFields.$inc.messagesSent = 1;
  if (status === 'DELIVERED') updateFields.$inc.messagesDelivered = 1;
  if (status === 'READ') updateFields.$inc.messagesRead = 1;
  if (status === 'FAILED') updateFields.$inc.messagesFailed = 1;

  if (category === 'MARKETING') updateFields.$inc.marketingCount = 1;
  if (category === 'UTILITY') updateFields.$inc.utilityCount = 1;
  if (category === 'AUTHENTICATION') updateFields.$inc.authCount = 1;
  if (category === 'SERVICE') updateFields.$inc.serviceCount = 1;

  await WhatsAppUsage.findOneAndUpdate(
    { companyId, date: dateStr },
    {
      ...updateFields,
      $setOnInsert: { companyId, date: dateStr, month: monthStr }
    },
    { upsert: true, new: true }
  );
}

module.exports = {
  getRateCard,
  estimateCampaignCost,
  getOrCreateWallet,
  validateCampaignBudget,
  debitWallet,
  creditWallet,
  recordUsage
};
