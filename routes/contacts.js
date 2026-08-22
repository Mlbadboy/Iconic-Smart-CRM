const express = require('express');
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Order = require('../models/Order');
const ServiceRequest = require('../models/ServiceRequest');
const { auth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();

router.use(requireFeature('customers'));

function getCompanyFilter(req) {
  const role = String(req.user?.role || '').toLowerCase();
  let companyId = req.user?.companyId;
  if ((role === 'super-admin' || role === 'superadmin') && req.query.companyId) {
    companyId = req.query.companyId;
  } else if ((role === 'super-admin' || role === 'superadmin') && !companyId) {
    return {};
  }
  if (!companyId) return {};
  const compObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;
  return { companyId: compObjectId };
}

// Get customer statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const compFilter = getCompanyFilter(req);
    const [total, active, retailers, corporate] = await Promise.all([
      Contact.countDocuments(compFilter),
      Contact.countDocuments({ ...compFilter, status: 'Active' }),
      Contact.countDocuments({ ...compFilter, contactType: 'Retailer' }),
      Contact.countDocuments({ ...compFilter, contactType: 'Corporate' })
    ]);
    res.json({ total, active, retailers, corporate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get contacts with search and filtering
router.get('/', auth, async (req, res) => {
  try {
    const compFilter = getCompanyFilter(req);
    const { search, type, status } = req.query;

    const query = { ...compFilter };
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { company: regex },
        { city: regex }
      ];
    }
    if (type && type !== 'ALL') {
      query.contactType = type;
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const contacts = await Contact.find(query).sort({ createdAt: -1 }).limit(100).lean();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single contact details with customer 360 overview
router.get('/:id', auth, async (req, res) => {
  try {
    const compFilter = getCompanyFilter(req);
    const contact = await Contact.findOne({ _id: req.params.id, ...compFilter }).lean();
    if (!contact) return res.status(404).json({ message: 'Customer contact not found' });

    // Find related orders & service tickets
    const [orders, serviceRequests] = await Promise.all([
      Order.find({
        ...compFilter,
        $or: [
          { 'customer.email': contact.email },
          { retailerEmail: contact.email },
          { customerEmail: contact.email }
        ]
      }).sort({ createdAt: -1 }).limit(5).lean(),
      ServiceRequest.find({
        ...compFilter,
        $or: [
          { customerEmail: contact.email },
          { customerPhone: contact.phone }
        ]
      }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    res.json({
      ...contact,
      recentOrders: orders,
      recentServiceRequests: serviceRequests,
      totalOrders: orders.length,
      totalServiceRequests: serviceRequests.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add contact
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, company, position, contactType, address, city, state, pincode, notes, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const contact = new Contact({
      companyId: req.user?.companyId,
      userId: req.user?.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      company: company?.trim(),
      position: position?.trim(),
      contactType: contactType || 'Customer',
      address,
      city: city?.trim(),
      state: state?.trim(),
      pincode: pincode?.trim(),
      notes,
      status: status || 'Active'
    });

    await contact.save();
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update contact
router.put('/:id', auth, async (req, res) => {
  try {
    const compFilter = getCompanyFilter(req);
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, ...compFilter },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Customer contact not found' });
    res.json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete contact
router.delete('/:id', auth, async (req, res) => {
  try {
    const compFilter = getCompanyFilter(req);
    const result = await Contact.findOneAndDelete({ _id: req.params.id, ...compFilter });
    if (!result) return res.status(404).json({ message: 'Customer contact not found' });
    res.json({ message: 'Customer contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
