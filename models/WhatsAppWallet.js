const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppCampaign',
    default: null
  },
  referenceId: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

const whatsAppWalletSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 1000, // Initial default complimentary testing balance
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  lowBalanceThreshold: {
    type: Number,
    default: 500
  },
  autoRecharge: {
    type: Boolean,
    default: false
  },
  transactions: [walletTransactionSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('WhatsAppWallet', whatsAppWalletSchema);
