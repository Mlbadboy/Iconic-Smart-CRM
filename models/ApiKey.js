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
  description: { 
    type: String 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin', 'serial_validation.validate', 'serial_validation.import']
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
  expiresAt: { 
    type: Date 
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

// Index for faster lookups
apiKeySchema.index({ key: 1, active: 1 });
apiKeySchema.index({ userId: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
