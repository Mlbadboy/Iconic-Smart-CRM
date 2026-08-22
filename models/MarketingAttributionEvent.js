const mongoose = require('mongoose');

const marketingAttributionEventSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'campaignModel',
    required: true,
    index: true
  },
  campaignModel: {
    type: String,
    enum: ['WhatsAppCampaign', 'MetaAdCampaign', 'SocialPost', 'MarketingCampaignPlan'],
    default: 'WhatsAppCampaign'
  },
  campaignName: {
    type: String,
    required: true
  },
  channel: {
    type: String,
    enum: ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'META_ADS', 'REEL', 'OMNICHANNEL'],
    required: true
  },
  eventType: {
    type: String,
    enum: [
      'IMPRESSION',
      'DELIVERED',
      'READ',
      'CLICK',
      'INBOUND_REPLY',
      'LEAD_CAPTURED',
      'OPPORTUNITY_CREATED',
      'ORDER_PLACED',
      'SERVICE_BOOKED'
    ],
    required: true,
    index: true
  },
  utmSource: { type: String, default: null },
  utmMedium: { type: String, default: null },
  utmCampaign: { type: String, default: null },
  utmContent: { type: String, default: null },
  recipientPhone: { type: String, default: null },
  recipientName: { type: String, default: null },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null,
    index: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    default: null,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  serviceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    default: null
  },
  cost: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => ({})
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

marketingAttributionEventSchema.index({ companyId: 1, eventType: 1, createdAt: -1 });
marketingAttributionEventSchema.index({ companyId: 1, campaignId: 1 });

module.exports = mongoose.model('MarketingAttributionEvent', marketingAttributionEventSchema);
