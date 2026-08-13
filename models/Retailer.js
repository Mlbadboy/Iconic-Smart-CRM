const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Retailer', retailerSchema);
