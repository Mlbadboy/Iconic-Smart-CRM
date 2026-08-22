const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  feature: {
    type: String,
    default: 'Serial Number Validation'
  },
  clientName: {
    type: String,
    trim: true
  },
  description: { 
    type: String 
  },
  partnerName: {
    type: String,
    trim: true
  },
  partnerType: {
    type: String,
    enum: ['ERP', 'DEALER_APP', 'MOBILE', 'INTEGRATOR', 'INTERNAL'],
    default: 'INTEGRATOR'
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
    default: 'ACTIVE',
    index: true
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin', 'serial_validation.validate', 'serial_validation.import', 'product.verify', 'serial.verify']
  }],
  scope: [{
    type: String,
    trim: true
  }],
  dealerScope: [{
    type: String,
    trim: true
  }],
  allowedOrigins: [String],
  rateLimit: {
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 10000 }
  },
  usage: {
    totalRequests: { type: Number, default: 0 },
    lastUsed: { type: Date }
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  expiresAt: { 
    type: Date 
  },
  revokedAt: {
    type: Date,
    default: null
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

// Pre-save synchronization
apiKeySchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.active = (this.status === 'ACTIVE');
  } else if (this.isModified('active') && !this.isModified('status')) {
    this.status = this.active ? 'ACTIVE' : 'REVOKED';
  }
  if (!this.clientName && this.partnerName) {
    this.clientName = this.partnerName;
  } else if (!this.partnerName && this.clientName) {
    this.partnerName = this.clientName;
  }
  if (this.usage?.lastUsed && !this.lastUsedAt) {
    this.lastUsedAt = this.usage.lastUsed;
  }
  next();
});

// Index for faster lookups
apiKeySchema.index({ key: 1, active: 1, companyId: 1 });
apiKeySchema.index({ companyId: 1, status: 1 });
apiKeySchema.index({ userId: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
