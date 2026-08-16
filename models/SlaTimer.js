const mongoose = require('mongoose');

const slaTimerSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['lead', 'opportunity', 'order', 'service-request']
  },
  entityId: {
    type: String,
    required: true
  },
  slaType: {
    type: String,
    required: true,
    enum: ['response', 'resolution']
  },
  targetTime: {
    type: Date,
    required: true
  },
  warningTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'breached'],
    default: 'active'
  },
  breachedAt: Date,
  pausedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Compound index to quickly find timers by entity
slaTimerSchema.index({ entityType: 1, entityId: 1 });
slaTimerSchema.index({ status: 1, targetTime: 1 });

module.exports = mongoose.model('SlaTimer', slaTimerSchema);
