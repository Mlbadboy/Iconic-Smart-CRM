const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SerialRegistry',
    required: true,
    index: true
  },
  serialNumber: {
    type: String,
    required: true,
    index: true
  },
  materialCode: {
    type: String,
    required: true,
    index: true
  },
  transactionType: {
    type: String,
    enum: ['INITIAL_INGESTION', 'TRANSFER_DISPATCH', 'TRANSFER_ACCEPT', 'TRANSFER_REJECT', 'CUSTOMER_SALE', 'RETURN', 'ADJUSTMENT'],
    required: true,
    index: true
  },
  fromHolderType: {
    type: String,
    enum: ['COMPANY', 'DISTRIBUTOR', 'DEALER', 'RETAILER', 'CUSTOMER', 'SYSTEM'],
    required: true
  },
  fromHolderId: {
    type: String,
    required: true
  },
  toHolderType: {
    type: String,
    enum: ['COMPANY', 'DISTRIBUTOR', 'DEALER', 'RETAILER', 'CUSTOMER', 'SYSTEM'],
    required: true
  },
  toHolderId: {
    type: String,
    required: true
  },
  transferNumber: {
    type: String,
    index: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  notes: String
}, {
  timestamps: false
});

stockLedgerSchema.index({ companyId: 1, serialNumber: 1, timestamp: -1 });
stockLedgerSchema.index({ companyId: 1, materialCode: 1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
