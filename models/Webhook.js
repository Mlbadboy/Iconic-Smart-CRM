const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  url: { 
    type: String, 
    required: true 
  },
  events: [{
    type: String,
    enum: [
      'order.created',
      'order.updated',
      'order.paid',
      'order.shipped',
      'order.delivered',
      'order.cancelled',
      'service.created',
      'service.updated',
      'service.resolved',
      'lead.created',
      'lead.converted',
      'delivery.updated',
      'payment.completed',
      'payment.failed'
    ]
  }],
  active: { 
    type: Boolean, 
    default: true 
  },
  secret: { 
    type: String,
    required: true  // For webhook signature verification
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  retryPolicy: {
    maxRetries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 5000 }  // milliseconds
  },
  stats: {
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    lastDelivery: { type: Date },
    lastSuccess: { type: Date },
    lastFailure: { type: Date }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Webhook', webhookSchema);
