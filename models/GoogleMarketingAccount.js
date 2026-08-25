const mongoose = require('mongoose');

const googleMarketingAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
    unique: true
  },
  customerId: {
    type: String,
    default: ''
  },
  accountName: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    default: 'INR'
  },
  timeZone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  monthlySpendCap: {
    type: Number,
    default: 100000
  },
  currentMonthSpend: {
    type: Number,
    default: 0
  },
  // Google Merchant Center
  merchantCenter: {
    merchantId: { type: String, default: '' },
    feedStatus: { type: String, enum: ['ACTIVE', 'SYNCING', 'ERROR', 'INACTIVE'], default: 'INACTIVE' },
    lastSyncAt: { type: Date, default: null },
    totalProducts: { type: Number, default: 0 },
    approvedProducts: { type: Number, default: 0 },
    pendingProducts: { type: Number, default: 0 },
    disapprovedProducts: { type: Number, default: 0 },
    complianceIssues: [{
      productId: String,
      productTitle: String,
      issue: String,
      severity: { type: String, enum: ['ERROR', 'WARNING', 'INFO'], default: 'WARNING' }
    }]
  },
  // Google Business Profile
  businessProfile: {
    locationId: { type: String, default: '' },
    locationName: { type: String, default: '' },
    address: { type: String, default: '' },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    lastReviewSyncAt: { type: Date, default: null }
  },
  // Performance snapshots
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpl: { type: Number, default: 0 },
    roas: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GoogleMarketingAccount', googleMarketingAccountSchema);
