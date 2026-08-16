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
    unique: true,
    trim: true
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
    enum: ['ACTIVE', 'VALIDATED'],
    default: 'ACTIVE',
    required: true
  },
  registrationDate: {
    type: Date
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SerialRegistry', serialRegistrySchema);
