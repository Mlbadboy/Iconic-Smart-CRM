const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadId: { type: String, default: function() { return 'LEAD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); } },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], default: 'new' },
  source: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
