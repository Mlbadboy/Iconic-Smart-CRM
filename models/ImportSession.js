const mongoose = require('mongoose');

const importSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  fileHash: {
    type: String,
    required: true
  },
  records: [{
    rowNumber: Number,
    materialCode: String,
    serialNumber: String,
    dealerCode: String,
    customer: String
  }],
  summary: {
    totalRows: Number,
    validRows: Number,
    invalidRows: Number,
    newCount: Number,
    updateCount: Number,
    unchangedCount: Number
  },
  status: {
    type: String,
    enum: ['PREVIEWED', 'COMMITTED', 'EXPIRED', 'CANCELLED'],
    default: 'PREVIEWED',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  committedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  committedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ImportSession', importSessionSchema);
