const mongoose = require('mongoose');

const platformNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'RENEWAL',
      'PAYMENT_DUE',
      'SYSTEM_MAINTENANCE',
      'DOWNTIME',
      'SECURITY',
      'STORAGE',
      'NEW_FEATURE',
      'GENERAL'
    ],
    default: 'GENERAL',
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  audience: {
    type: String,
    enum: ['ALL_COMPANIES', 'SELECTED_COMPANIES', 'SELECTED_PLAN'],
    default: 'ALL_COMPANIES'
  },
  targetCompanies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  targetPlans: [{
    type: String,
    enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']
  }],
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  actionUrl: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'],
    default: 'PUBLISHED',
    index: true
  },
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    readAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

platformNotificationSchema.index({ status: 1, startTime: 1, endTime: 1 });
platformNotificationSchema.index({ audience: 1, targetCompanies: 1 });

module.exports = mongoose.model('PlatformNotification', platformNotificationSchema);
