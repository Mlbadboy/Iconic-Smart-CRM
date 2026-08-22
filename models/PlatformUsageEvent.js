const mongoose = require('mongoose');

const platformUsageEventSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  module: {
    type: String,
    required: true,
    enum: [
      'SALES',
      'INVENTORY',
      'DISTRIBUTION',
      'SERVICE',
      'SERIAL_VALIDATION',
      'API',
      'REPORTS',
      'MARKETING',
      'CUSTOMER_360',
      'AUTH',
      'SETTINGS'
    ],
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'WARNING'],
    default: 'SUCCESS'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for fast analytical rollups
platformUsageEventSchema.index({ companyId: 1, module: 1, timestamp: -1 });
platformUsageEventSchema.index({ module: 1, timestamp: -1 });
platformUsageEventSchema.index({ timestamp: -1 });

module.exports = mongoose.model('PlatformUsageEvent', platformUsageEventSchema);
