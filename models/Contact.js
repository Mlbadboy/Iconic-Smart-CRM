const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  position: { type: String, trim: true },
  contactType: { type: String, enum: ['Customer', 'Retailer', 'Distributor', 'Partner', 'Individual', 'Corporate'], default: 'Customer' },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'Lead', 'Prospect'], default: 'Active' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contact', contactSchema);
