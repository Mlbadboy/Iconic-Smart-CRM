const mongoose = require('mongoose');

const omnichannelScheduleSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  channel: {
    type: String,
    enum: ['WHATSAPP', 'INSTAGRAM_POST', 'INSTAGRAM_REEL', 'FACEBOOK_POST', 'META_AD', 'GOOGLE_AD', 'GOOGLE_PROMOTION'],
    required: true
  },
  scheduleType: {
    type: String,
    enum: ['RECURRING_WEEKLY', 'ONE_OFF', 'HOLIDAY_ROADMAP'],
    default: 'ONE_OFF'
  },
  dayOfWeek: {
    type: String,
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', null],
    default: null
  },
  scheduledTime: {
    type: String, // e.g. "10:00 AM"
    required: true
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContentAsset',
    default: null
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingCampaignPlan',
    default: null
  },
  preflightStatus: {
    type: String,
    enum: ['PENDING', 'PASSED', 'FAILED'],
    default: 'PENDING'
  },
  approvalStatus: {
    type: String,
    enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'NOT_REQUIRED'
  },
  executionStatus: {
    type: String,
    enum: ['SCHEDULED', 'QUEUED', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  executionResult: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

omnichannelScheduleSchema.index({ companyId: 1, executionStatus: 1, scheduledDate: 1 });

module.exports = mongoose.model('OmnichannelSchedule', omnichannelScheduleSchema);
