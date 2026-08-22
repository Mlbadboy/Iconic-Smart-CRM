const mongoose = require('mongoose');

const whatsAppMediaSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'],
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  localPath: {
    type: String,
    required: true
  },
  storageUrl: {
    type: String,
    required: true
  },
  whatsappMediaId: {
    type: String,
    default: null,
    index: true
  },
  whatsappMediaIdExpiresAt: {
    type: Date,
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

whatsAppMediaSchema.index({ companyId: 1, fileType: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppMedia', whatsAppMediaSchema);
