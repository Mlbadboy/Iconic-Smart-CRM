const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  direction: {
    type: String,
    enum: ['INBOUND', 'OUTBOUND'],
    required: true,
    index: true
  },
  from: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  to: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  messageType: {
    type: String,
    enum: ['template', 'text', 'image', 'video', 'document', 'audio', 'interactive', 'location', 'contacts', 'unknown'],
    default: 'text'
  },
  content: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    default: null
  },
  wamid: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true
  },
  conversationId: {
    type: String,
    index: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppCampaign',
    default: null
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppContact',
    default: null
  },
  status: {
    type: String,
    enum: ['SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED'],
    default: 'SENT',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  rawPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

whatsAppMessageSchema.index({ companyId: 1, conversationId: 1, createdAt: -1 });
whatsAppMessageSchema.index({ companyId: 1, from: 1, to: 1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
