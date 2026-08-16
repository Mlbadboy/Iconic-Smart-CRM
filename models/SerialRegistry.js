const mongoose = require('mongoose');

const serialRegistrySchema = new mongoose.Schema({
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
  dealerCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  customer: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'VALIDATED', 'EXPIRED', 'DEACTIVATED'],
    default: 'ACTIVE',
    required: true
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
  ownershipHistory: [{
    dealerCode: String,
    customerId: String,
    customerName: String,
    source: {
      type: String,
      enum: ['CSV_IMPORT', 'MANUAL_EDIT', 'API_SYNC', 'DEALER_TRANSFER'],
      default: 'CSV_IMPORT'
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

// Compound unique index on materialCode + serialNumber
serialRegistrySchema.index({ materialCode: 1, serialNumber: 1 }, { unique: true });

module.exports = mongoose.model('SerialRegistry', serialRegistrySchema);
