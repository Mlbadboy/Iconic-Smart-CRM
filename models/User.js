const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { 
    type: String, 
    enum: [
      'super-admin', 'superadmin', 'company-admin', 'sub-admin',
      'admin', 'administrator', 'auditor', 'manager', 'crm-manager', 'crm-executive', 
      'sales-manager', 'sales-executive', 'sales', 'service-manager', 'service-agent', 
      'finance-manager', 'finance-executive', 'marketing-manager', 'marketing-executive', 
      'operations-manager', 'support-agent', 'field-executive', 'distributor-manager',
      'dealer-manager', 'user', 'member'
    ], 
    default: 'user' 
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company',
    index: true 
  },
  customRoleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Role' 
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  department: {
    type: String,
    trim: true
  },
  reportingManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scopeType: {
    type: String,
    enum: ['ALL', 'REGION', 'TERRITORY', 'DISTRIBUTOR', 'DEALER', 'RETAILER', 'SELF', 'DEALER_NETWORK', 'OWN'],
    default: 'ALL'
  },
  scopeValues: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['ACTIVE', 'LOCKED', 'DISABLED'],
    default: 'ACTIVE'
  },
  isActive: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },
  lockReason: { type: String, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastLogin: Date,
  lastActivity: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.index({ companyId: 1, email: 1 });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, department: 1 });
userSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('User', userSchema);
