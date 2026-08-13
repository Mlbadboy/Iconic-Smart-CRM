const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceId: { type: String, default: function() { return 'SVC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); } },
  orderRef: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issueType: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedTo: { type: String },
  serviceHistory: [{ status: String, timestamp: Date, note: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);
