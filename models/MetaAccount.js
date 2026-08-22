const mongoose = require('mongoose');

const metaPageSchema = new mongoose.Schema({
  pageId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, default: null },
  fanCount: { type: Number, default: 0 },
  pictureUrl: { type: String, default: null },
  encryptedPageAccessToken: { type: String, select: false, default: null },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const instagramAccountSchema = new mongoose.Schema({
  igId: { type: String, required: true },
  pageId: { type: String, required: true },
  username: { type: String, required: true },
  name: { type: String, default: null },
  profilePictureUrl: { type: String, default: null },
  followersCount: { type: Number, default: 0 },
  mediaCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const adAccountSchema = new mongoose.Schema({
  adAccountId: { type: String, required: true },
  accountName: { type: String, required: true },
  currency: { type: String, default: 'INR' },
  accountStatus: { type: Number, default: 1 }, // 1 = ACTIVE
  amountSpent: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const metaPixelSchema = new mongoose.Schema({
  pixelId: { type: String, required: true },
  name: { type: String, required: true },
  lastFiredTime: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const metaAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  metaBusinessId: {
    type: String,
    trim: true,
    default: null
  },
  businessName: {
    type: String,
    trim: true,
    default: null
  },
  metaUserId: {
    type: String,
    trim: true,
    default: null
  },
  metaUserName: {
    type: String,
    trim: true,
    default: null
  },
  metaUserEmail: {
    type: String,
    trim: true,
    default: null
  },
  encryptedUserAccessToken: {
    type: String,
    required: true,
    select: false
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  connectionStatus: {
    type: String,
    enum: ['CONNECTED', 'DEGRADED', 'DISCONNECTED', 'EXPIRED'],
    default: 'CONNECTED'
  },
  healthMessage: {
    type: String,
    default: 'Healthy connection to Meta Graph API'
  },
  lastHealthCheck: {
    type: Date,
    default: Date.now
  },
  pages: [metaPageSchema],
  instagramAccounts: [instagramAccountSchema],
  adAccounts: [adAccountSchema],
  pixels: [metaPixelSchema],
  selectedPageId: {
    type: String,
    default: null
  },
  selectedInstagramId: {
    type: String,
    default: null
  },
  selectedAdAccountId: {
    type: String,
    default: null
  },
  selectedPixelId: {
    type: String,
    default: null
  },
  connectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

metaAccountSchema.index({ companyId: 1 }, { unique: true });

module.exports = mongoose.model('MetaAccount', metaAccountSchema);
