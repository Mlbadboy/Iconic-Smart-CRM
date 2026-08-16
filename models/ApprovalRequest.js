const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['order', 'service-request', 'finance']
  },
  entityId: {
    type: String,
    required: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: ['order_limit', 'refund_approval', 'discount_approval']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  amount: Number,
  reason: {
    type: String,
    required: true
  },
  responseReason: String
}, {
  timestamps: true
});

approvalRequestSchema.index({ status: 1 });
approvalRequestSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
