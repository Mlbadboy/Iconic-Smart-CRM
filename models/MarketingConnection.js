const mongoose = require('mongoose');

const marketingConnectionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: [
      'WHATSAPP_BUSINESS',
      'META_FACEBOOK',
      'META_INSTAGRAM',
      'META_ADS',
      'GOOGLE_ADS',
      'GOOGLE_MERCHANT',
      'GOOGLE_BUSINESS_PROFILE',
      'AI_PROVIDER'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED', 'NEEDS_REAUTH'],
    default: 'DISCONNECTED'
  },
  displayName: {
    type: String,
    default: ''
  },
  accountId: {
    type: String,
    default: ''
  },
  encryptedCredentials: {
    type: String, // AES-256 encrypted access token / API key
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  qualityScore: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
    default: 'HIGH'
  },
  lastHealthCheck: {
    type: Date,
    default: Date.now
  },
  lastHealthStatus: {
    type: String,
    default: 'OK'
  },
  errorMessage: {
    type: String,
    default: null
  },
  connectedAt: {
    type: Date,
    default: null
  },
  connectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

marketingConnectionSchema.index({ companyId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('MarketingConnection', marketingConnectionSchema);
