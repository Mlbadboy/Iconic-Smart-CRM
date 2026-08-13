const mongoose = require('mongoose');

const marketingAssetSchema = new mongoose.Schema({
  assetId: { type: String, default: function() { return 'ASSET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); } },
  title: { type: String, required: true },
  imageRef: { type: String },
  active: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MarketingAsset', marketingAssetSchema);
