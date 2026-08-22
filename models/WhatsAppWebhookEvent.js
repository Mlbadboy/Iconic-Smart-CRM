const mongoose = require('mongoose');

const whatsAppWebhookEventSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
    index: true
  },
  phoneNumberId: {
    type: String,
    index: true
  },
  eventType: {
    type: String, // 'messages', 'statuses', 'template_status_update', etc.
    required: true,
    index: true
  },
  wamid: {
    type: String,
    index: true,
    default: null
  },
  from: String,
  to: String,
  status: String, // 'sent', 'delivered', 'read', 'failed'
  rawEvent: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

whatsAppWebhookEventSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppWebhookEvent', whatsAppWebhookEventSchema);
