const mongoose = require('mongoose');
const { nextSequence } = require('../services/sequenceService');

const orderSchema = new mongoose.Schema({
  orderNumber: { 
    type: String, 
    unique: true 
  },
  orderId: { type: String, default: function() { return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); } },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer' },
  retailerName: String,
  retailerEmail: String,
  retailerPhone: String,
  retailerGST: String,
  items: [{
    productId: String,
    sku: String,
    name: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: Number,
  gstRate: { type: Number, default: 18 },
  gstAmount: Number,
  amount: { type: Number, required: true },
  invoiceNumber: String,
  invoicePdfPath: String,
  invoiceGeneratedAt: Date,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: String,
  orderStatus: { type: String, enum: ['pending', 'confirmed', 'processing', 'ready-to-ship', 'dispatched', 'shipped', 'delivered', 'completed', 'cancelled'], default: 'confirmed' },
  status: { type: String, enum: ['pending', 'confirmed', 'processing', 'ready-to-ship', 'dispatched', 'shipped', 'delivered', 'completed', 'cancelled'], default: 'confirmed' },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  deliveryAddress: String,
  customer: {
    name: String,
    email: String,
    phone: String
  },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  dispatchDate: Date,
  deliveryDate: Date
});

// Generate concurrency-safe order number before saving.
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    this.orderNumber = await nextSequence('orders', { prefix: 'ORD', pad: 6 });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
