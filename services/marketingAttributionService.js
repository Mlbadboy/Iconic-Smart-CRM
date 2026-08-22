const MarketingAttributionEvent = require('../models/MarketingAttributionEvent');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Order = require('../models/Order');
const logger = require('./logger');

/**
 * Records an immutable marketing attribution event
 */
async function recordAttributionEvent(eventData) {
  try {
    const {
      companyId,
      campaignId,
      campaignModel = 'WhatsAppCampaign',
      campaignName,
      channel,
      eventType,
      utmSource = null,
      utmMedium = null,
      utmCampaign = null,
      utmContent = null,
      recipientPhone = null,
      recipientName = null,
      leadId = null,
      contactId = null,
      orderId = null,
      serviceRequestId = null,
      cost = 0,
      revenue = 0,
      metadata = {}
    } = eventData;

    const event = await MarketingAttributionEvent.create({
      companyId,
      campaignId,
      campaignModel,
      campaignName,
      channel,
      eventType,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      recipientPhone,
      recipientName,
      leadId,
      contactId,
      orderId,
      serviceRequestId,
      cost,
      revenue,
      metadata
    });

    logger.info(`📊 [Attribution] ${eventType} on ${channel} for "${campaignName}" (Revenue: ₹${revenue}, Cost: ₹${cost})`);
    return event;
  } catch (err) {
    logger.warn('Notice recording attribution event:', err.message);
    return null;
  }
}

/**
 * Ingests inbound reply or Meta lead into CRM and records attribution
 */
async function ingestInboundMarketingLead(companyId, leadData) {
  const {
    name,
    phone,
    email = null,
    city = null,
    campaignId,
    campaignName = 'Inbound Marketing Campaign',
    channel = 'WHATSAPP',
    productInterest = 'Smart Appliance',
    message = null
  } = leadData;

  // 1. Create or update Lead record in CRM
  let lead = await Lead.findOne({ companyId, phone });
  let isNewLead = false;

  if (!lead) {
    lead = new Lead({
      companyId,
      name: name || 'Inbound Prospect',
      email: email || `${phone.replace(/\D/g, '')}@inbound.crm`,
      phone,
      city,
      status: 'new',
      source: `Marketing Campaign: ${campaignName}`,
      productInterest
    });
    isNewLead = true;
  } else {
    lead.notes = `${lead.notes || ''}\nInbound message from campaign ${campaignName}: ${message || 'Interested'}`;
  }

  await lead.save();

  // 2. Record LEAD_CAPTURED attribution event
  await recordAttributionEvent({
    companyId,
    campaignId,
    campaignName,
    channel,
    eventType: 'LEAD_CAPTURED',
    recipientPhone: phone,
    recipientName: name,
    leadId: lead._id,
    metadata: { isNewLead, message, productInterest }
  });

  return { lead, isNewLead };
}

/**
 * Calculates complete closed-loop ROI, conversion rate, and ROAS for a campaign
 */
async function getClosedLoopCampaignAnalytics(companyId, campaignId) {
  const events = await MarketingAttributionEvent.find({ companyId, campaignId });

  let totalCost = 0;
  let totalRevenue = 0;
  let impressions = 0;
  let delivered = 0;
  let reads = 0;
  let clicks = 0;
  let inboundReplies = 0;
  let leadsCaptured = 0;
  let opportunitiesCreated = 0;
  let ordersPlaced = 0;
  let serviceBookings = 0;

  events.forEach(e => {
    totalCost += e.cost || 0;
    totalRevenue += e.revenue || 0;

    switch (e.eventType) {
      case 'IMPRESSION': impressions++; break;
      case 'DELIVERED': delivered++; break;
      case 'READ': reads++; break;
      case 'CLICK': clicks++; break;
      case 'INBOUND_REPLY': inboundReplies++; break;
      case 'LEAD_CAPTURED': leadsCaptured++; break;
      case 'OPPORTUNITY_CREATED': opportunitiesCreated++; break;
      case 'ORDER_PLACED': ordersPlaced++; break;
      case 'SERVICE_BOOKED': serviceBookings++; break;
    }
  });

  const totalConversions = ordersPlaced + serviceBookings;
  const roas = totalCost > 0 ? Math.round((totalRevenue / totalCost) * 100) / 100 : (totalRevenue > 0 ? totalRevenue : 0);
  const cac = totalConversions > 0 ? Math.round((totalCost / totalConversions) * 100) / 100 : totalCost;
  const leadConversionRate = leadsCaptured > 0 ? Math.round((totalConversions / leadsCaptured) * 1000) / 10 : 0;

  return {
    campaignId,
    financials: {
      totalCost,
      totalRevenue,
      roas: `${roas}x`,
      roasMultiplier: roas,
      customerAcquisitionCost: cac
    },
    funnel: {
      impressions,
      delivered,
      reads,
      clicks,
      inboundReplies,
      leadsCaptured,
      opportunitiesCreated,
      ordersPlaced,
      serviceBookings,
      totalConversions,
      leadConversionRatePercent: `${leadConversionRate}%`
    }
  };
}

module.exports = {
  recordAttributionEvent,
  ingestInboundMarketingLead,
  getClosedLoopCampaignAnalytics
};
