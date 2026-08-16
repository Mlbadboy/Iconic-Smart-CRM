const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
  slaTimerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SlaTimer',
    required: true
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: String,
    required: true
  },
  previousOwner: String,
  escalatedTo: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['medium', 'high', 'urgent'],
    default: 'high'
  },
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open'
  },
  resolvedAt: Date,
  resolvedBy: String,
  resolutionNote: String
}, {
  timestamps: true
});

escalationSchema.index({ status: 1 });
escalationSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('Escalation', escalationSchema);
