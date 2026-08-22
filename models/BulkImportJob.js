const mongoose = require('mongoose');

const bulkImportJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  importType: {
    type: String,
    enum: ['products', 'serials'],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  totalRows: {
    type: Number,
    default: 0
  },
  processedRows: {
    type: Number,
    default: 0
  },
  validRows: {
    type: Number,
    default: 0
  },
  warningRows: {
    type: Number,
    default: 0
  },
  errorRows: {
    type: Number,
    default: 0
  },
  importedRows: {
    type: Number,
    default: 0
  },
  rejectedRows: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: [
      'UPLOADED',
      'VALIDATING',
      'VALIDATED',
      'IMPORTING',
      'COMPLETED',
      'COMPLETED_WITH_ERRORS',
      'FAILED',
      'CANCELLED'
    ],
    default: 'UPLOADED',
    required: true,
    index: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  startedAt: Date,
  completedAt: Date,
  errorFilePath: String,
  resultFilePath: String
}, {
  timestamps: true
});

module.exports = mongoose.model('BulkImportJob', bulkImportJobSchema);
