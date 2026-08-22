const mongoose = require('mongoose');

const serialRegistrySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  materialCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  qrCode: {
    type: String,
    trim: true
  },
  batchNumber: {
    type: String,
    trim: true
  },
  manufacturingDate: {
    type: Date
  },
  // Unit Authoritative Inventory Holder state
  currentHolderType: {
    type: String,
    enum: ['COMPANY', 'DISTRIBUTOR', 'DEALER', 'RETAILER', 'CUSTOMER'],
    default: 'COMPANY',
    required: true,
    index: true
  },
  currentHolderId: {
    type: String,
    index: true
  },
  holderName: {
    type: String,
    trim: true
  },
  dealerCode: {
    type: String,
    trim: true,
    index: true
  },
  // Unit lifecycle state
  status: {
    type: String,
    enum: ['IN_STOCK', 'IN_TRANSIT', 'TRANSFERRED', 'SOLD', 'REGISTERED', 'VALIDATED', 'DEFECTIVE', 'DEACTIVATED'],
    default: 'IN_STOCK',
    required: true,
    index: true
  },
  registrationStatus: {
    type: String,
    enum: ['REGISTERED', 'PENDING', 'DEACTIVATED'],
    default: 'REGISTERED'
  },
  activationStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED'],
    default: 'ACTIVE'
  },
  registrationDate: {
    type: Date
  },
  warrantyEndDate: {
    type: Date
  },
  customer: {
    type: String,
    trim: true
  },
  ownershipHistory: [{
    fromHolderType: String,
    fromHolderId: String,
    toHolderType: String,
    toHolderId: String,
    dealerCode: String,
    transferRef: String,
    source: {
      type: String,
      enum: ['INITIAL_STOCK', 'STOCK_TRANSFER', 'CSV_IMPORT', 'MANUAL_EDIT', 'API_SYNC', 'DEALER_TRANSFER', 'CUSTOMER_SALE'],
      default: 'INITIAL_STOCK'
    },
    importSessionId: String,
    assignedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound unique index scoped strictly per company
serialRegistrySchema.index({ companyId: 1, materialCode: 1, serialNumber: 1 }, { unique: true });
serialRegistrySchema.index({ companyId: 1, currentHolderType: 1, currentHolderId: 1, status: 1 });
serialRegistrySchema.index({ companyId: 1, dealerCode: 1, status: 1 });

module.exports = mongoose.model('SerialRegistry', serialRegistrySchema);
