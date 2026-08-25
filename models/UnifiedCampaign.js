const mongoose = require('mongoose');

const unifiedCampaignSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  campaignCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  objective: {
    type: String,
    enum: ['FESTIVE_SALES', 'LEAD_GENERATION', 'WARRANTY_RENEWAL', 'PRODUCT_LAUNCH', 'BRAND_AWARENESS', 'CUSTOM'],
    default: 'FESTIVE_SALES'
  },
  channels: [{
    type: String,
    enum: ['WHATSAPP', 'META_FACEBOOK', 'META_INSTAGRAM', 'META_ADS', 'GOOGLE_ADS', 'GOOGLE_MERCHANT']
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PREFLIGHT_PENDING', 'PREFLIGHT_PASSED', 'PREFLIGHT_FAILED', 'APPROVAL_PENDING', 'APPROVED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'DRAFT'
  },
  targetAudience: {
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingSegment', default: null },
    cohortName: { type: String, default: '' },
    recipientCount: { type: Number, default: 0 }
  },
  assets: [{
    channel: String,
    assetType: { type: String, enum: ['IMAGE', 'VIDEO', 'REEL', 'COPY', 'TEMPLATE'] },
    title: String,
    contentUrl: String,
    copyText: String
  }],
  budget: {
    whatsAppEstimatedCost: { type: Number, default: 0 },
    metaAdBudget: { type: Number, default: 0 },
    googleAdBudget: { type: Number, default: 0 },
    creativeCost: { type: Number, default: 0 },
    totalEstimatedBudget: { type: Number, default: 0 },
    actualTotalSpend: { type: Number, default: 0 }
  },
  preflightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PreflightSnapshot',
    default: null
  },
  attributionSummary: {
    inboundLeads: { type: Number, default: 0 },
    qualifiedOpportunities: { type: Number, default: 0 },
    closedOrders: { type: Number, default: 0 },
    totalAttributedRevenue: { type: Number, default: 0 },
    calculatedRoas: { type: Number, default: 0 },
    calculatedCac: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UnifiedCampaign', unifiedCampaignSchema);
