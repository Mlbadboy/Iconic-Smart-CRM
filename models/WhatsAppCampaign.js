const mongoose = require('mongoose');

const whatsAppCampaignSchema = new mongoose.Schema({
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
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppTemplate',
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  templateLanguage: {
    type: String,
    default: 'en_US'
  },
  templateCategory: {
    type: String,
    default: 'MARKETING'
  },
  audienceType: {
    type: String,
    enum: ['SAVED_SEGMENT', 'CSV_UPLOAD', 'ALL_CUSTOMERS', 'CUSTOM_FILTER'],
    default: 'SAVED_SEGMENT'
  },
  audienceFilter: {
    customerType: String,
    state: String,
    city: String,
    product: String,
    tags: [String],
    customCriteria: mongoose.Schema.Types.Mixed
  },
  mediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppMedia',
    default: null
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'DOCUMENT', 'NONE'],
    default: 'NONE'
  },
  variableMappings: {
    type: Map,
    of: String, // e.g. "1" -> "{{name}}", "2" -> "{{product}}"
    default: () => ({})
  },
  stats: {
    totalRecipients: { type: Number, default: 0 },
    validCount: { type: Number, default: 0 },
    invalidCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    optOutCount: { type: Number, default: 0 },
    eligibleCount: { type: Number, default: 0 },
    queuedCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    rejectedCount: { type: Number, default: 0 }
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  ratePerMessage: {
    type: Number,
    default: 0.8631
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'QUEUED', 'PROCESSING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED'],
    default: 'DRAFT',
    index: true
  },
  pauseReason: {
    type: String,
    default: null
  },
  failureThresholdPercent: {
    type: Number,
    default: 15 // Auto-pause if failures exceed 15%
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

whatsAppCampaignSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppCampaign', whatsAppCampaignSchema);
