const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  opportunityId: { type: String, default: function() { return 'OPP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); } },
  name: { type: String, required: true },
  value: { type: Number, required: true },
  stage: { type: String, enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'], default: 'prospecting' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  assignedTo: { type: String },
  expectedCloseDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Opportunity', opportunitySchema);
