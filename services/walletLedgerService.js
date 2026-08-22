const WhatsAppWallet = require('../models/WhatsAppWallet');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const logger = require('./logger');

/**
 * Idempotent, race-condition safe wallet fund reservation
 */
async function reserveWalletFunds(companyId, campaignId, estimatedAmount, idempotencyKey, userId = null) {
  if (estimatedAmount <= 0) {
    return { success: true, reservedAmount: 0, balance: 0 };
  }

  let wallet = await WhatsAppWallet.findOne({ companyId });
  if (!wallet) {
    // If not found, check WhatsAppAccount
    const waba = await WhatsAppAccount.findOne({ companyId });
    const initialBal = waba?.walletBalance || 0;
    wallet = await WhatsAppWallet.create({
      companyId,
      balance: initialBal,
      currency: 'INR'
    });
  }

  // Check idempotency: if this exact reservation key was already recorded
  const existingTx = wallet.transactions.find(t => t.referenceId === idempotencyKey);
  if (existingTx) {
    return {
      success: true,
      alreadyReserved: true,
      reservedAmount: existingTx.amount,
      balance: wallet.balance
    };
  }

  // Atomic reservation check & deduction
  const updatedWallet = await WhatsAppWallet.findOneAndUpdate(
    { companyId, balance: { $gte: estimatedAmount } },
    {
      $inc: { balance: -estimatedAmount },
      $push: {
        transactions: {
          type: 'DEBIT',
          amount: estimatedAmount,
          balanceAfter: wallet.balance - estimatedAmount,
          description: `Campaign Fund Reservation for Campaign ID ${campaignId}`,
          campaignId,
          referenceId: idempotencyKey,
          createdBy: userId,
          createdAt: new Date()
        }
      }
    },
    { new: true }
  );

  if (!updatedWallet) {
    throw new Error(`Insufficient wallet balance. Required: ₹${estimatedAmount}, Available: ₹${wallet.balance}`);
  }

  logger.info(`💳 [Wallet Ledger] Reserved ₹${estimatedAmount} for campaign ${campaignId}. Closing Balance: ₹${updatedWallet.balance}`);
  return {
    success: true,
    reservedAmount: estimatedAmount,
    balance: updatedWallet.balance
  };
}

/**
 * Release unused campaign funds back to wallet
 */
async function releaseUnusedReservation(companyId, campaignId, unusedAmount, idempotencyKey, userId = null) {
  if (unusedAmount <= 0) return { success: true, releasedAmount: 0 };

  const wallet = await WhatsAppWallet.findOne({ companyId });
  if (!wallet) throw new Error('Wallet not found');

  const existingTx = wallet.transactions.find(t => t.referenceId === idempotencyKey);
  if (existingTx) {
    return { success: true, alreadyReleased: true, balance: wallet.balance };
  }

  const updatedWallet = await WhatsAppWallet.findOneAndUpdate(
    { companyId },
    {
      $inc: { balance: unusedAmount },
      $push: {
        transactions: {
          type: 'REFUND',
          amount: unusedAmount,
          balanceAfter: wallet.balance + unusedAmount,
          description: `Released Unused Campaign Reservation for Campaign ID ${campaignId}`,
          campaignId,
          referenceId: idempotencyKey,
          createdBy: userId,
          createdAt: new Date()
        }
      }
    },
    { new: true }
  );

  logger.info(`💳 [Wallet Ledger] Released ₹${unusedAmount} back to wallet for campaign ${campaignId}. Closing Balance: ₹${updatedWallet.balance}`);
  return {
    success: true,
    releasedAmount: unusedAmount,
    balance: updatedWallet.balance
  };
}

module.exports = {
  reserveWalletFunds,
  releaseUnusedReservation
};
