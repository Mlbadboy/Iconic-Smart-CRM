const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: String,
  action: { type: String, required: true, index: true },
  entity: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  source: { type: String, default: 'api' },
  ip: String,
  reason: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

auditEventSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

auditEventSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('Audit events are append-only and cannot be modified'));
  }
  next();
});

auditEventSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function(next) {
  next(new Error('Audit events are append-only and cannot be updated or deleted'));
});

module.exports = mongoose.model('AuditEvent', auditEventSchema);
