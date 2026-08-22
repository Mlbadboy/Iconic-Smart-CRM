const mongoose = require('mongoose');

const hierarchyNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['ZONE', 'REGION', 'TERRITORY', 'DISTRIBUTOR', 'DEALER', 'RETAILER', 'CUSTOM'],
    default: 'REGION'
  },
  parentId: { type: String, default: null },
  managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: Map, of: String }
}, { _id: false });

const brandingSchema = new mongoose.Schema({
  logo: { type: String, default: null },
  favicon: { type: String, default: null },
  primaryColor: { type: String, default: '#667eea' },
  secondaryColor: { type: String, default: '#764ba2' },
  accentColor: { type: String, default: '#3B82F6' },
  loginBranding: {
    heading: { type: String, default: null },
    subtitle: { type: String, default: null },
    bgImageUrl: { type: String, default: null }
  },
  emailBranding: {
    footerText: { type: String, default: null },
    supportEmail: { type: String, default: null },
    supportPhone: { type: String, default: null },
    senderName: { type: String, default: null }
  }
}, { _id: false });

const billingSchema = new mongoose.Schema({
  plan: { 
    type: String, 
    enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'], 
    default: 'STARTER' 
  },
  billingCycle: { 
    type: String, 
    enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM'], 
    default: 'MONTHLY' 
  },
  subscriptionStart: { type: Date, default: Date.now },
  subscriptionEnd: { type: Date, default: null },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'DUE', 'OVERDUE', 'GRACE_PERIOD', 'TRIAL'],
    default: 'PAID'
  },
  lastPaymentDate: { type: Date, default: Date.now },
  nextDueDate: { type: Date, default: null },
  gracePeriodEnd: { type: Date, default: null },
  autoRenew: { type: Boolean, default: true },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' }
}, { _id: false });

const storageSchema = new mongoose.Schema({
  storageLimitBytes: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5 GB
  storageUsedBytes: { type: Number, default: 0 },
  storageWarningThreshold: { type: Number, default: 80 }, // 80%
  storageCriticalThreshold: { type: Number, default: 95 }  // 95%
}, { _id: false });

const marketingConfigSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  whatsapp: { type: Boolean, default: true },
  bulk_whatsapp: { type: Boolean, default: true },
  bulk_campaigns: { type: Boolean, default: true },
  media_campaigns: { type: Boolean, default: true },
  social: { type: Boolean, default: true },
  reels: { type: Boolean, default: true },
  meta_ads: { type: Boolean, default: true },
  content_studio: { type: Boolean, default: true },
  calendar: { type: Boolean, default: true },
  ai_marketing: { type: Boolean, default: true },
  approval_workflow: { type: Boolean, default: true },
  analytics: { type: Boolean, default: true },
  template_management: { type: Boolean, default: true },
  monthly_message_limit: { type: Number, default: 50000 },
  daily_message_limit: { type: Number, default: 5000 },
  monthly_post_limit: { type: Number, default: 500 },
  monthly_ad_spend_limit: { type: Number, default: 100000 },
  content_storage_mb: { type: Number, default: 5120 },
  rate_per_marketing_msg: { type: Number, default: 0.8631 },
  rate_per_utility_msg: { type: Number, default: 0.35 },
  rate_per_auth_msg: { type: Number, default: 0.35 },
  platform_fee_markup: { type: Number, default: 0.15 },
  subscription_tier: { type: String, enum: ['STARTER', 'GROWTH', 'ENTERPRISE'], default: 'GROWTH' },
  billing_status: { type: String, enum: ['ACTIVE', 'PAST_DUE', 'TRIAL', 'SUSPENDED'], default: 'ACTIVE' }
}, { _id: false });

const featureEntitlementsSchema = new mongoose.Schema({
  dashboard: { type: Boolean, default: true },
  sales: { type: Boolean, default: true },
  customers: { type: Boolean, default: true },
  orders: { type: Boolean, default: true },
  products: { type: Boolean, default: true },
  inventory: { type: Boolean, default: true },
  distribution: { type: Boolean, default: true },
  serial_validation: { type: Boolean, default: true },
  qr_verification: { type: Boolean, default: true },
  service: { type: Boolean, default: true },
  warranty: { type: Boolean, default: true },
  marketing: { type: Boolean, default: true },
  marketing_config: { type: marketingConfigSchema, default: () => ({}) },
  finance: { type: Boolean, default: true },
  field_force: { type: Boolean, default: true },
  logistics: { type: Boolean, default: true },
  reports: { type: Boolean, default: true },
  api_access: { type: Boolean, default: true },
  analytics: { type: Boolean, default: true },
  bulk_import: { type: Boolean, default: true }
}, { _id: false });

const companySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  },
  displayName: {
    type: String,
    trim: true,
    default: null
  },
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true,
    index: true 
  },
  subdomain: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true
  },
  customDomain: {
    type: String,
    lowercase: true,
    trim: true,
    default: null
  },
  logo: { type: String }, // Legacy top-level logo support
  branding: { 
    type: brandingSchema, 
    default: () => ({}) 
  },
  status: {
    type: String,
    enum: ['PROVISIONING', 'ACTIVE', 'PAYMENT_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'DEACTIVATED'],
    default: 'ACTIVE',
    index: true
  },
  suspensionReason: { type: String, default: null },
  suspendedAt: { type: Date, default: null },
  reactivatedAt: { type: Date, default: null },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  billing: {
    type: billingSchema,
    default: () => ({})
  },
  storage: {
    type: storageSchema,
    default: () => ({})
  },
  features: {
    type: featureEntitlementsSchema,
    default: () => ({})
  },
  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    pincode: String
  },
  settings: {
    gstNumber: String,
    defaultGstRate: { type: Number, default: 18 },
    invoicePrefix: { type: String, default: 'INV' },
    orderPrefix: { type: String, default: 'ORD' },
    defaultWarrantyMonths: { type: Number, default: 12 },
    currency: { type: String, default: 'INR' }
  },
  hierarchyConfig: {
    levels: [{
      levelNumber: Number,
      name: String,
      allowedChildTypes: [String]
    }],
    nodes: [hierarchyNodeSchema]
  },
  primaryAdminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

// Pre-save synchronization between status and isActive boolean
companySchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.isActive = (this.status === 'ACTIVE' || this.status === 'PAYMENT_DUE' || this.status === 'GRACE_PERIOD');
  } else if (this.isModified('isActive') && !this.isModified('status')) {
    this.status = this.isActive ? 'ACTIVE' : 'DEACTIVATED';
  }
  // Sync legacy top-level logo with branding.logo
  if (this.branding?.logo && !this.logo) {
    this.logo = this.branding.logo;
  } else if (this.logo && (!this.branding || !this.branding.logo)) {
    if (!this.branding) this.branding = {};
    this.branding.logo = this.logo;
  }
  next();
});

companySchema.index({ code: 1, status: 1 });
companySchema.index({ subdomain: 1, status: 1 });

module.exports = mongoose.model('Company', companySchema);
