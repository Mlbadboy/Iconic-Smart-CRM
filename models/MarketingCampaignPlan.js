const mongoose = require('mongoose');

const campaignMilestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channel: {
    type: String,
    enum: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK', 'META_ADS', 'EMAIL'],
    required: true
  },
  actionType: {
    type: String,
    enum: ['TEASER', 'MAIN_OFFER', 'REEL_SHOWCASE', 'AD_LAUNCH', 'BROADCAST', 'REMINDER', 'LAST_CALL', 'PERFORMANCE_REVIEW'],
    default: 'MAIN_OFFER'
  },
  scheduledDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['PLANNED', 'READY', 'IN_REVIEW', 'APPROVED', 'DISPATCHED', 'COMPLETED', 'SKIPPED'],
    default: 'PLANNED'
  },
  linkedSocialPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialPost', default: null },
  linkedWhatsAppCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppCampaign', default: null },
  linkedMetaAdCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'MetaAdCampaign', default: null },
  notes: { type: String, default: null }
}, { _id: true });

const marketingCampaignPlanSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  objective: {
    type: String,
    enum: ['FESTIVAL_SALES', 'NEW_PRODUCT_LAUNCH', 'LEAD_GENERATION', 'BRAND_AWARENESS', 'DEALER_PROMOTION', 'REENGAGEMENT'],
    default: 'FESTIVAL_SALES'
  },
  holidayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingHoliday',
    default: null
  },
  holidayName: {
    type: String,
    default: null
  },
  targetAudienceDescription: {
    type: String,
    default: null
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalBudget: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    default: 'PLANNING',
    index: true
  },
  milestones: [campaignMilestoneSchema],
  aggregateMetrics: {
    whatsAppSent: { type: Number, default: 0 },
    whatsAppDelivered: { type: Number, default: 0 },
    socialImpressions: { type: Number, default: 0 },
    socialEngagements: { type: Number, default: 0 },
    adSpend: { type: Number, default: 0 },
    adClicks: { type: Number, default: 0 },
    leadsGenerated: { type: Number, default: 0 },
    revenueInfluenced: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

marketingCampaignPlanSchema.index({ companyId: 1, status: 1 });
marketingCampaignPlanSchema.index({ companyId: 1, startDate: 1 });

module.exports = mongoose.model('MarketingCampaignPlan', marketingCampaignPlanSchema);
