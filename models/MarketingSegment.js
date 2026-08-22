const mongoose = require('mongoose');

const marketingSegmentSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: null
  },
  targetEntity: {
    type: String,
    enum: ['CUSTOMERS', 'LEADS', 'DEALERS', 'ALL'],
    default: 'CUSTOMERS'
  },
  filterCriteria: {
    productCategories: [{ type: String }],
    warrantyExpiringWithinDays: { type: Number, default: null }, // e.g. 30, 60, 90 days
    city: [{ type: String }],
    state: [{ type: String }],
    leadStatus: [{ type: String }], // 'new', 'contacted', 'qualified', 'lost'
    customerTier: [{ type: String }], // 'VIP', 'Regular', 'Enterprise'
    hasOpenServiceRequest: { type: Boolean, default: null },
    lastPurchaseOlderThanDays: { type: Number, default: null }
  },
  calculatedCount: {
    type: Number,
    default: 0
  },
  lastCalculatedAt: {
    type: Date,
    default: null
  },
  campaignUsageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

marketingSegmentSchema.index({ companyId: 1, name: 1 });

module.exports = mongoose.model('MarketingSegment', marketingSegmentSchema);
