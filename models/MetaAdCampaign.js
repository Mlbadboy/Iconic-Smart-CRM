const mongoose = require('mongoose');

const adSetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dailyBudget: { type: Number, required: true },
  targeting: {
    locations: [{ type: String, default: 'India' }],
    minAge: { type: Number, default: 18 },
    maxAge: { type: Number, default: 65 },
    genders: [{ type: String, enum: ['ALL', 'MEN', 'WOMEN'], default: 'ALL' }],
    interests: [{ type: String, trim: true }],
    customAudienceIds: [{ type: String }],
    lookalikeAudienceIds: [{ type: String }]
  },
  placements: {
    facebookFeed: { type: Boolean, default: true },
    instagramFeed: { type: Boolean, default: true },
    instagramReels: { type: Boolean, default: true },
    facebookReels: { type: Boolean, default: true },
    instagramStories: { type: Boolean, default: true },
    audienceNetwork: { type: Boolean, default: false }
  },
  externalAdSetId: { type: String, default: null },
  status: { type: String, enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'], default: 'ACTIVE' }
}, { _id: true });

const adCreativeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  headline: { type: String, required: true },
  primaryText: { type: String, required: true },
  callToAction: {
    type: String,
    enum: ['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'CONTACT_US', 'GET_OFFER', 'ORDER_NOW', 'SEND_WHATSAPP_MESSAGE'],
    default: 'LEARN_MORE'
  },
  destinationUrl: { type: String, default: null },
  mediaUrl: { type: String, default: null },
  sourcePostId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialPost', default: null },
  externalCreativeId: { type: String, default: null },
  externalAdId: { type: String, default: null }
}, { _id: true });

const metaAdCampaignSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  objective: {
    type: String,
    enum: ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION'],
    default: 'OUTCOME_LEADS'
  },
  adAccountId: {
    type: String,
    required: true
  },
  pixelId: {
    type: String,
    default: null
  },
  campaignType: {
    type: String,
    enum: ['NEW_CAMPAIGN', 'BOOST_POST', 'BOOST_REEL'],
    default: 'NEW_CAMPAIGN'
  },
  boostedPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialPost',
    default: null
  },
  budgetType: {
    type: String,
    enum: ['DAILY', 'LIFETIME'],
    default: 'DAILY'
  },
  budgetAmount: {
    type: Number,
    required: true,
    min: 100 // Min INR ₹100
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  adSets: [adSetSchema],
  creatives: [adCreativeSchema],
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'REJECTED'],
    default: 'DRAFT',
    index: true
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingApproval',
    default: null
  },
  externalCampaignId: {
    type: String,
    default: null
  },
  insights: {
    spend: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    costPerLead: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

metaAdCampaignSchema.index({ companyId: 1, status: 1 });
metaAdCampaignSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('MetaAdCampaign', metaAdCampaignSchema);
