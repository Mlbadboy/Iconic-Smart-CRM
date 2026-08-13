const mongoose = require('mongoose');
const Retailer = require('../models/Retailer');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const MarketingAsset = require('../models/MarketingAsset');

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueDefined(values) {
  return [...new Set(values.filter(Boolean))];
}

async function getCustomer360(customerId, { includeFinance = false, limit = 10 } = {}) {
  const objectId = mongoose.Types.ObjectId.isValid(customerId) ? customerId : null;
  const profile = objectId ? await Retailer.findById(objectId).lean() : null;
  if (!profile) return null;

  const emails = uniqueDefined([profile.email]);
  const phones = uniqueDefined([profile.phone]);
  const namePattern = profile.retailerName ? new RegExp(escapeRegex(profile.retailerName), 'i') : null;
  const contactQuery = { $or: [{ email: { $in: emails } }, { phone: { $in: phones } }] };
  const leadQuery = { $or: [{ email: { $in: emails } }, { phone: { $in: phones } }, ...(namePattern ? [{ name: namePattern }] : [])] };

  const orderRefs = profile.orderHistory?.map(order => order.orderNumber).filter(Boolean) || [];
  const [contacts, leads, orders, serviceRequests, services, marketingEngagement] = await Promise.all([
    Contact.find(contactQuery).limit(limit).lean(),
    Lead.find(leadQuery).limit(limit).lean(),
    Order.find({ $or: [{ retailerId: profile._id }, { retailerEmail: { $in: emails } }, { retailerPhone: { $in: phones } }] }).sort({ createdAt: -1 }).limit(limit).lean(),
    orderRefs.length ? ServiceRequest.find({ orderRef: { $in: orderRefs } }).sort({ createdAt: -1 }).limit(limit).lean() : [],
    orderRefs.length ? Service.find({ orderRef: { $in: orderRefs } }).sort({ createdAt: -1 }).limit(limit).lean() : [],
    MarketingAsset.find({ active: true }).sort({ startDate: -1 }).limit(limit).lean()
  ]);

  const opportunities = leads.length
    ? await Opportunity.find({ leadId: { $in: leads.map(lead => lead._id) } }).limit(limit).lean()
    : [];
  const deliveries = orders.length
    ? await Delivery.find({ orderRef: { $in: orders.flatMap(order => [order.orderNumber, order.orderId].filter(Boolean)) } }).limit(limit).lean()
    : [];

  const financialSummary = includeFinance ? {
    totalOrderValue: orders.reduce((sum, order) => sum + (order.amount || 0), 0),
    pendingPayments: orders.filter(order => order.paymentStatus === 'pending').length,
    failedPayments: orders.filter(order => order.paymentStatus === 'failed').length
  } : undefined;

  return {
    profile,
    contacts,
    leads,
    opportunities,
    orders,
    deliveries,
    products: orders.flatMap(order => order.items || []).slice(0, limit),
    warranty: { registrations: [], claims: [], note: 'Warranty domain model is not yet implemented.' },
    serviceCases: [...serviceRequests, ...services].slice(0, limit),
    complaints: serviceRequests.filter(request => /complaint|issue|repair/i.test(`${request.issueType || ''} ${request.description || ''}`)).slice(0, limit),
    marketingEngagement,
    communications: [],
    escalations: serviceRequests.filter(request => ['urgent', 'high'].includes(request.priority) || request.status === 'closed').slice(0, limit),
    openTasks: serviceRequests.filter(request => ['open', 'in-progress'].includes(request.status)).slice(0, limit),
    ...(financialSummary && { financialSummary })
  };
}

module.exports = { getCustomer360 };
