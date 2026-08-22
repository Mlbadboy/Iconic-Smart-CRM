const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    default: 'Untitled Post'
  },
  postType: {
    type: String,
    enum: ['POST', 'REEL', 'STORY', 'CAROUSEL'],
    default: 'POST'
  },
  platforms: [{
    type: String,
    enum: ['FACEBOOK', 'INSTAGRAM']
  }],
  targetPageId: {
    type: String,
    default: null
  },
  targetInstagramId: {
    type: String,
    default: null
  },
  caption: {
    type: String,
    required: true,
    trim: true
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  mediaUrls: [{
    url: { type: String, required: true },
    mediaType: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentAsset', default: null }
  }],
  coverImageUrl: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  mentions: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'REJECTED'],
    default: 'DRAFT',
    index: true
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingApproval',
    default: null
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  publishedAt: {
    type: Date,
    default: null
  },
  campaignPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingCampaignPlan',
    default: null
  },
  holidayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingHoliday',
    default: null
  },
  externalMetaIds: {
    facebookPostId: { type: String, default: null },
    instagramMediaId: { type: String, default: null },
    reelContainerId: { type: String, default: null }
  },
  isBoosted: {
    type: Boolean,
    default: false
  },
  boostAdCampaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MetaAdCampaign',
    default: null
  },
  metrics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    saved: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null }
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

socialPostSchema.index({ companyId: 1, status: 1 });
socialPostSchema.index({ companyId: 1, scheduledAt: 1 });
socialPostSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('SocialPost', socialPostSchema);
