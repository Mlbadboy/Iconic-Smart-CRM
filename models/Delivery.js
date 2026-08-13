const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryId: { type: String, default: function() { return 'DEL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); } },
  orderRef: { type: String, required: true },
  courier: { type: String },
  eta: { type: Date },
  currentStatus: { type: String, enum: ['pending', 'picked-up', 'in-transit', 'delivered'], default: 'pending' },
  history: [{ status: String, timestamp: Date }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', deliverySchema);
