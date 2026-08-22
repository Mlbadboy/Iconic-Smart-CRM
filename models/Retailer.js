const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true
    },
    partnerType: {
        type: String,
        enum: ['DISTRIBUTOR', 'DEALER', 'RETAILER'],
        default: 'RETAILER',
        index: true
    },
    partnerCode: {
        type: String,
        trim: true,
        index: true
    },
    retailerName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true
    },
    gstNumber: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
    },
    billingAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
    },
    companyName: String,
    contactPerson: String,
    totalOrders: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    lastOrderDate: Date,
    orderHistory: [{
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        orderNumber: String,
        amount: Number,
        date: Date
    }],
    active: {
        type: Boolean,
        default: true
    },
    notes: String
}, {
    timestamps: true
});

retailerSchema.index({ email: 1 }, { unique: true });
retailerSchema.index({ phone: 1 });
retailerSchema.index({ retailerName: 1 });

retailerSchema.index({ companyId: 1, email: 1 });
retailerSchema.index({ companyId: 1, partnerType: 1 });
retailerSchema.index({ companyId: 1, partnerCode: 1 });

module.exports = mongoose.model('Retailer', retailerSchema);
