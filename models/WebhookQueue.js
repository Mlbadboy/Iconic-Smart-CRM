const mongoose = require('mongoose');

const webhookQueueSchema = new mongoose.Schema({
  webhookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  payload: {
    type: Object,
    required: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 5
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  lastError: String,
  nextAttemptAt: {
    type: Date,
    default: Date.now
  },
  correlationId: String
}, {
  timestamps: true
});

webhookQueueSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = mongoose.model('WebhookQueue', webhookQueueSchema);
