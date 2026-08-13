const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['admin', 'administrator', 'auditor', 'manager', 'crm-manager', 'crm-executive', 'sales-manager', 'sales-executive', 'sales', 'service-manager', 'service-agent', 'finance-manager', 'finance-executive', 'marketing-manager', 'marketing-executive', 'operations-manager', 'support-agent', 'field-executive', 'user', 'member'], default: 'user' },
  department: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
