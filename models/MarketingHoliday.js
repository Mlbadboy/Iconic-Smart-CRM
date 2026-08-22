const mongoose = require('mongoose');

const marketingHolidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  month: {
    type: Number, // 1 - 12
    required: true
  },
  day: {
    type: Number, // 1 - 31
    required: true
  },
  country: {
    type: String,
    default: 'IN'
  },
  state: {
    type: String,
    default: 'ALL' // 'ALL' or specific state like 'Maharashtra', 'Gujarat', 'Tamil Nadu'
  },
  category: {
    type: String,
    enum: ['NATIONAL', 'FESTIVAL', 'SEASONAL', 'COMMERCIAL', 'REGIONAL', 'CULTURAL'],
    default: 'FESTIVAL'
  },
  businessRelevance: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'HIGH'
  },
  recurring: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  suggestedThemes: [{
    type: String,
    trim: true
  }],
  suggestedChannels: [{
    type: String,
    enum: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS', 'EMAIL']
  }],
  campaignBlueprint: [{
    phaseOffsetDays: { type: Number }, // e.g. -10 for 10 days before
    channel: { type: String, enum: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS', 'EMAIL'] },
    actionType: { type: String, enum: ['TEASER', 'MAIN_OFFER', 'REEL_SHOWCASE', 'AD_LAUNCH', 'BROADCAST', 'REMINDER', 'LAST_CALL'] },
    suggestedTitle: { type: String },
    suggestedCopyPrompt: { type: String }
  }],
  isGlobalMaster: {
    type: Boolean,
    default: true
  },
  customCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  }
}, {
  timestamps: true
});

marketingHolidaySchema.index({ month: 1, day: 1 });
marketingHolidaySchema.index({ date: 1 });
marketingHolidaySchema.index({ customCompanyId: 1 });

module.exports = mongoose.model('MarketingHoliday', marketingHolidaySchema);
