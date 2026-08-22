const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const MarketingSegment = require('../models/MarketingSegment');
const { normalizePhone } = require('./whatsAppContactService');
const logger = require('./logger');

/**
 * Evaluates and fetches matching contacts from CRM for a given segment definition
 */
async function resolveSegmentContacts(companyId, filterCriteria, targetEntity = 'CUSTOMERS') {
  let contacts = [];
  const {
    productCategories,
    city,
    state,
    leadStatus,
    customerTier,
    contactType
  } = filterCriteria || {};

  // If targeting CRM Contacts / Customers
  if (['CUSTOMERS', 'ALL'].includes(targetEntity)) {
    const contactFilter = { companyId };
    if (city && city.length > 0) contactFilter.city = { $in: city };
    if (state && state.length > 0) contactFilter.state = { $in: state };
    if (contactType && contactType.length > 0) contactFilter.contactType = { $in: contactType };

    const customers = await Contact.find(contactFilter).lean();

    customers.forEach(c => {
      const norm = normalizePhone(c.phone || c.mobile || '');
      if (norm.valid) {
        contacts.push({
          entityId: c._id,
          entityType: 'Contact',
          name: c.name || 'Valued Customer',
          phone: norm.normalized,
          email: c.email || null,
          city: c.city || null,
          state: c.state || null,
          customVariables: {
            customer_name: c.name || 'Customer',
            city: c.city || ''
          }
        });
      }
    });
  }

  // If targeting CRM Leads
  if (['LEADS', 'ALL'].includes(targetEntity)) {
    const leadFilter = { companyId };
    if (leadStatus && leadStatus.length > 0) leadFilter.status = { $in: leadStatus };

    const leads = await Lead.find(leadFilter).lean();

    leads.forEach(l => {
      const norm = normalizePhone(l.phone || l.mobile || '');
      if (norm.valid) {
        contacts.push({
          entityId: l._id,
          entityType: 'Lead',
          name: l.name || 'Prospective Customer',
          phone: norm.normalized,
          email: l.email || null,
          city: l.city || null,
          customVariables: {
            customer_name: l.name || 'Valued Prospect',
            inquiry_product: l.productInterest || 'Smart Appliance'
          }
        });
      }
    });
  }

  // Deduplicate by phone
  const seen = new Set();
  const uniqueContacts = [];
  for (const c of contacts) {
    if (!seen.has(c.phone)) {
      seen.add(c.phone);
      uniqueContacts.push(c);
    }
  }

  return uniqueContacts;
}

/**
 * Creates or updates a dynamic marketing segment and calculates current audience size
 */
async function saveAndCalculateSegment(companyId, segmentData, userId) {
  const { name, description, targetEntity, filterCriteria } = segmentData;

  const contacts = await resolveSegmentContacts(companyId, filterCriteria, targetEntity);

  const segment = await MarketingSegment.create({
    companyId,
    name,
    description,
    targetEntity,
    filterCriteria,
    calculatedCount: contacts.length,
    lastCalculatedAt: new Date(),
    createdBy: userId
  });

  return {
    segment,
    contactsSample: contacts.slice(0, 10),
    totalCount: contacts.length
  };
}

module.exports = {
  resolveSegmentContacts,
  saveAndCalculateSegment
};
