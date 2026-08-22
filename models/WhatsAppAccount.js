const mongoose = require('mongoose');

const whatsAppAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
    index: true
  },
  wabaId: {
    type: String,
    trim: true,
    required: true
  },
  phoneNumberId: {
    type: String,
    trim: true,
    required: true
  },
  displayPhoneNumber: {
    type: String,
    trim: true
  },
  verifiedName: {
    type: String,
    trim: true
  },
  businessPortfolioId: {
    type: String,
    trim: true
  },
  // AES-256-GCM encrypted token - never returned to frontend
  encryptedAccessToken: {
    type: String,
    required: true,
    select: false
  },
  // AES-256-GCM encrypted webhook verification token
  encryptedWebhookSecret: {
    type: String,
    select: false
  },
  webhookVerifyToken: {
    type: String,
    select: false
  },
  connectionStatus: {
    type: String,
    enum: ['CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING_VERIFICATION'],
    default: 'CONNECTED',
    index: true
  },
  qualityRating: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
    default: 'GREEN'
  },
  messagingLimit: {
    type: String,
    enum: ['TIER_50', 'TIER_250', 'TIER_1K', 'TIER_10K', 'TIER_100K', 'UNLIMITED'],
    default: 'TIER_1K'
  },
  lastTestedAt: {
    type: Date,
    default: null
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  lastError: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

whatsAppAccountSchema.index({ companyId: 1, connectionStatus: 1 });

module.exports = mongoose.model('WhatsAppAccount', whatsAppAccountSchema);
