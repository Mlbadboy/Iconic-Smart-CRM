const mongoose = require('mongoose');

const whatsAppUsageSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  month: {
    type: String, // 'YYYY-MM'
    required: true,
    index: true
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    index: true
  },
  messagesSent: { type: Number, default: 0 },
  messagesDelivered: { type: Number, default: 0 },
  messagesRead: { type: Number, default: 0 },
  messagesFailed: { type: Number, default: 0 },
  marketingCount: { type: Number, default: 0 },
  utilityCount: { type: Number, default: 0 },
  authCount: { type: Number, default: 0 },
  serviceCount: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 }
}, {
  timestamps: true
});

whatsAppUsageSchema.index({ companyId: 1, month: 1 });
whatsAppUsageSchema.index({ companyId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WhatsAppUsage', whatsAppUsageSchema);
