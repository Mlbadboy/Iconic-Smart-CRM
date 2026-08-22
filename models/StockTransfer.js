const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
  transferNumber: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  materialCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  fromHolderType: {
    type: String,
    enum: ['COMPANY', 'DISTRIBUTOR', 'DEALER', 'RETAILER'],
    required: true
  },
  fromHolderId: {
    type: String,
    required: true
  },
  fromHolderName: {
    type: String,
    trim: true
  },
  toHolderType: {
    type: String,
    enum: ['DISTRIBUTOR', 'DEALER', 'RETAILER', 'CUSTOMER'],
    required: true
  },
  toHolderId: {
    type: String,
    required: true
  },
  toHolderName: {
    type: String,
    trim: true
  },
  unitSerials: [{
    type: String,
    trim: true
  }],
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

stockTransferSchema.index({ companyId: 1, transferNumber: 1 }, { unique: true });
stockTransferSchema.index({ companyId: 1, status: 1 });
stockTransferSchema.index({ companyId: 1, toHolderId: 1, status: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
