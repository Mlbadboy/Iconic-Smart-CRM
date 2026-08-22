const mongoose = require('mongoose');

const marketingApprovalSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  itemType: {
    type: String,
    enum: ['SOCIAL_POST', 'SOCIAL_REEL', 'META_AD_CAMPAIGN', 'WHATSAPP_CAMPAIGN'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  itemTitle: {
    type: String,
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  estimatedBudget: {
    type: Number,
    default: 0
  },
  reviewerNotes: {
    type: String,
    trim: true,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null
  },
  itemSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

marketingApprovalSchema.index({ companyId: 1, status: 1 });
marketingApprovalSchema.index({ companyId: 1, requestedAt: -1 });

module.exports = mongoose.model('MarketingApproval', marketingApprovalSchema);
