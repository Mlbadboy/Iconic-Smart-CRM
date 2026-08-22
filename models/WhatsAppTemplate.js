const mongoose = require('mongoose');

const whatsAppTemplateSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  templateId: {
    type: String,
    trim: true,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
    default: 'MARKETING',
    index: true
  },
  language: {
    type: String,
    default: 'en_US',
    trim: true
  },
  status: {
    type: String,
    enum: ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'],
    default: 'APPROVED',
    index: true
  },
  headerType: {
    type: String,
    enum: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'],
    default: 'NONE'
  },
  headerText: {
    type: String,
    default: null
  },
  bodyText: {
    type: String,
    required: true
  },
  footerText: {
    type: String,
    default: null
  },
  buttons: [{
    type: {
      type: String,
      enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'COPY_CODE'],
      default: 'QUICK_REPLY'
    },
    text: String,
    url: String,
    phoneNumber: String
  }],
  // List of variables in the template e.g. ["1", "2", "3"]
  variables: [{
    position: Number,
    name: String,
    exampleValue: String
  }],
  sampleValues: {
    type: Map,
    of: String,
    default: () => ({})
  },
  rawComponents: {
    type: Array,
    default: []
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

whatsAppTemplateSchema.index({ companyId: 1, name: 1, language: 1 }, { unique: true });
whatsAppTemplateSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
