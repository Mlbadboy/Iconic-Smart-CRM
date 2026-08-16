const mongoose = require('mongoose');

const serialValidationHistorySchema = new mongoose.Schema({
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
      'UNKNOWN_RESPONSE',
      'SERVICE_UNAVAILABLE'
    ]
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
serialValidationHistorySchema.index({ validatedBy: 1 });
serialValidationHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('SerialValidationHistory', serialValidationHistorySchema);
