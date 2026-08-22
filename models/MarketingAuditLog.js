const mongoose = require('mongoose');

const marketingAuditLogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    default: 'System'
  },
  action: {
    type: String,
    required: true, // e.g. 'POST_CREATED', 'POST_PUBLISHED', 'AD_LAUNCHED', 'APPROVAL_GRANTED', 'WABA_CONNECTED', 'META_CONNECTED'
    index: true
  },
  channel: {
    type: String,
    enum: ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'META_ADS', 'CONTENT_STUDIO', 'CALENDAR', 'PLATFORM'],
    required: true
  },
  targetType: {
    type: String,
    default: null // 'SocialPost', 'MetaAdCampaign', 'WhatsAppCampaign', 'ContentAsset'
  },
  targetId: {
    type: String,
    default: null
  },
  targetTitle: {
    type: String,
    default: null
  },
  previousState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  budget: {
    type: Number,
    default: null
  },
  externalId: {
    type: String,
    default: null // Meta Post ID / WABA Message ID / Ad ID
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

marketingAuditLogSchema.index({ companyId: 1, createdAt: -1 });
marketingAuditLogSchema.index({ companyId: 1, action: 1 });

module.exports = mongoose.model('MarketingAuditLog', marketingAuditLogSchema);
