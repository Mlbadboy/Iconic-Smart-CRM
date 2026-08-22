const mongoose = require('mongoose');

const serialValidationHistorySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  materialCode: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true
  },
  dealerCode: {
    type: String,
    required: true,
    trim: true
  },
  responseStatus: {
    type: String,
    required: true
  },
  responseMessage: String,
  validationResult: {
    type: String,
    required: true,
    enum: [
      'VALID',
      'INVALID_SERIAL',
      'MODEL_SERIAL_MISMATCH',
      'ALREADY_VALIDATED',
      'INVALID_MATERIAL_CODE',
      'DEALER_MISMATCH',
      'UNAUTHORIZED',
      'RATE_LIMITED',
      'SERVICE_ERROR',
      'SERVICE_UNAVAILABLE',
      'UNKNOWN',
      'UNKNOWN_RESPONSE'
    ]
  },
  clientName: {
    type: String,
    trim: true
  },
  feature: {
    type: String,
    default: 'Serial Number Validation'
  },
  maskedSerial: {
    type: String,
    trim: true
  },
  serialHash: {
    type: String,
    trim: true
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: false,
    index: true
  },
  validatedAt: {
    type: Date,
    default: Date.now
  },
  requestId: String,
  latency: Number
}, {
  timestamps: true
});

// Indexes for performance and lookup
serialValidationHistorySchema.index({ serialNumber: 1 });
serialValidationHistorySchema.index({ companyId: 1, apiKeyId: 1, createdAt: -1 });
serialValidationHistorySchema.index({ companyId: 1, validationResult: 1 });
serialValidationHistorySchema.index({ companyId: 1, serialNumber: 1 });
serialValidationHistorySchema.index({ validatedBy: 1 });
serialValidationHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('SerialValidationHistory', serialValidationHistorySchema);
