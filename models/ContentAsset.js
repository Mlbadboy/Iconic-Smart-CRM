const mongoose = require('mongoose');

const contentAssetSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  assetType: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'REEL_CLIP', 'LOGO', 'BANNER', 'BROCHURE', 'PRODUCT_CREATIVE'],
    default: 'IMAGE'
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number, // in bytes
    default: 0
  },
  mimeType: {
    type: String,
    default: 'image/jpeg'
  },
  dimensions: {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  productName: {
    type: String,
    trim: true,
    default: null
  },
  brandName: {
    type: String,
    trim: true,
    default: null
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  campaignTag: {
    type: String,
    trim: true,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

contentAssetSchema.index({ companyId: 1, assetType: 1 });
contentAssetSchema.index({ companyId: 1, category: 1 });
contentAssetSchema.index({ companyId: 1, tags: 1 });

module.exports = mongoose.model('ContentAsset', contentAssetSchema);
