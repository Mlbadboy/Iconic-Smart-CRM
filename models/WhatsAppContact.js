const mongoose = require('mongoose');

const whatsAppContactSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    trim: true,
    required: true
  },
  mobile: {
    type: String,
    trim: true,
    required: true,
    index: true
  },
  normalizedPhone: {
    type: String,
    trim: true,
    required: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  city: {
    type: String,
    trim: true,
    default: null
  },
  state: {
    type: String,
    trim: true,
    default: null
  },
  dealerCode: {
    type: String,
    trim: true,
    default: null
  },
  product: {
    type: String,
    trim: true,
    default: null
  },
  customerType: {
    type: String,
    enum: ['CUSTOMER', 'DEALER', 'DISTRIBUTOR', 'RETAILER', 'PROSPECT', 'OTHER'],
    default: 'CUSTOMER'
  },
  customFields: {
    type: Map,
    of: String,
    default: () => ({})
  },
  tags: [{
    type: String,
    trim: true
  }],
  whatsappOptIn: {
    type: Boolean,
    default: true,
    index: true
  },
  whatsappOptInAt: {
    type: Date,
    default: Date.now
  },
  whatsappOptInSource: {
    type: String,
    enum: ['CSV_IMPORT', 'CRM_CUSTOMER', 'WEB_FORM', 'INBOUND_MESSAGE', 'MANUAL'],
    default: 'CSV_IMPORT'
  },
  whatsappOptOut: {
    type: Boolean,
    default: false,
    index: true
  },
  whatsappOptOutAt: {
    type: Date,
    default: null
  },
  optOutReason: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['VALID', 'INVALID', 'OPTED_OUT', 'BLOCKED'],
    default: 'VALID',
    index: true
  },
  invalidReason: {
    type: String,
    default: null
  },
  importSessionId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

whatsAppContactSchema.index({ companyId: 1, normalizedPhone: 1 }, { unique: true });
whatsAppContactSchema.index({ companyId: 1, status: 1, whatsappOptIn: 1, whatsappOptOut: 1 });
whatsAppContactSchema.index({ companyId: 1, customerType: 1, state: 1, city: 1 });

module.exports = mongoose.model('WhatsAppContact', whatsAppContactSchema);
