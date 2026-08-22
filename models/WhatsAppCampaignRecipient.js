const mongoose = require('mongoose');

const whatsAppCampaignRecipientSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppCampaign',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppContact',
    default: null
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  variableValues: [{
    position: Number,
    value: String
  }],
  mediaUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RETRY', 'REJECTED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  wamid: {
    type: String,
    trim: true,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  lastError: {
    type: String,
    default: null
  },
  errorCode: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

whatsAppCampaignRecipientSchema.index({ campaignId: 1, status: 1 });
whatsAppCampaignRecipientSchema.index({ companyId: 1, phone: 1, campaignId: 1 }, { unique: true });
whatsAppCampaignRecipientSchema.index({ wamid: 1 });

module.exports = mongoose.model('WhatsAppCampaignRecipient', whatsAppCampaignRecipientSchema);
