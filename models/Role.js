const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company',
    required: true,
    index: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  department: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  scopeType: {
    type: String,
    enum: ['ALL', 'REGION', 'TERRITORY', 'DISTRIBUTOR', 'DEALER', 'RETAILER', 'SELF', 'DEALER_NETWORK', 'OWN'],
    default: 'ALL'
  },
  scopeValues: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateKey: {
    type: String,
    trim: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

roleSchema.index({ companyId: 1, name: 1 }, { unique: true });
roleSchema.index({ companyId: 1, department: 1 });
roleSchema.index({ companyId: 1, isActive: 1 });

module.exports = mongoose.model('Role', roleSchema);
