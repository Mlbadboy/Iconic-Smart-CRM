const mongoose = require('mongoose');

const aiCreativeConfigSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
    unique: true
  },
  mode: {
    type: String,
    enum: ['PLATFORM', 'BYOK'],
    default: 'PLATFORM'
  },
  byokConfig: {
    provider: { type: String, enum: ['OPENAI', 'STABILITY', 'GEMINI'], default: 'GEMINI' },
    encryptedApiKey: { type: String, default: '' },
    model: { type: String, default: 'gemini-2.5-pro' },
    isVerified: { type: Boolean, default: false }
  },
  brandProfile: {
    brandName: { type: String, default: '' },
    tagline: { type: String, default: '' },
    brandTone: { 
      type: String, 
      enum: ['PREMIUM', 'CORPORATE', 'FRIENDLY', 'URGENT_FESTIVE', 'TECHNICAL', 'RETAIL'],
      default: 'PREMIUM'
    },
    primaryColor: { type: String, default: '#0052cc' },
    accentColor: { type: String, default: '#ffab00' },
    targetAudience: { type: String, default: 'Homeowners and residential buyers across India' },
    keySellingPoints: [{ type: String }],
    forbiddenTerms: [{ type: String }]
  },
  usage: {
    monthlyCreditLimit: { type: Number, default: 250 },
    creditsUsedThisMonth: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AiCreativeConfig', aiCreativeConfigSchema);
