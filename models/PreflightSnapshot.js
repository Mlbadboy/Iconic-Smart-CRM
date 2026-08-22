const mongoose = require('mongoose');

const preflightSnapshotSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  preflightId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  campaignType: {
    type: String,
    enum: ['WHATSAPP_BULK', 'META_AD', 'SOCIAL_OMNICHANNEL'],
    required: true
  },
  campaignName: {
    type: String,
    required: true,
    trim: true
  },
  templateName: {
    type: String,
    default: null
  },
  csvHash: {
    type: String,
    default: null
  },
  summary: {
    totalRecords: { type: Number, required: true },
    validRecipientsCount: { type: Number, required: true },
    invalidCount: { type: Number, default: 0 },
    duplicatesCount: { type: Number, default: 0 },
    missingNamesCount: { type: Number, default: 0 },
    optedOutCount: { type: Number, default: 0 },
    estimatedMessages: { type: Number, required: true }
  },
  financials: {
    ratePerMessage: { type: Number, required: true },
    estimatedCost: { type: Number, required: true },
    walletBalanceSnapshot: { type: Number, required: true },
    remainingBalanceAfterSend: { type: Number, required: true },
    isWalletSufficient: { type: Boolean, required: true }
  },
  validRecipients: [{
    phone: { type: String, required: true },
    name: { type: String, default: 'Valued Customer' },
    email: { type: String, default: null },
    customVariables: { type: Map, of: String, default: () => ({}) }
  }],
  invalidRows: [{
    rowIndex: Number,
    rawPhone: String,
    name: String,
    reason: String
  }],
  status: {
    type: String,
    enum: ['GENERATED', 'CONFIRMED', 'CONSUMED_IN_CAMPAIGN', 'EXPIRED'],
    default: 'GENERATED'
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppCampaign',
    default: null
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24-hour preflight validity
  }
}, {
  timestamps: true
});

preflightSnapshotSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('PreflightSnapshot', preflightSnapshotSchema);
