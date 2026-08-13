const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
    dispatchId: {
        type: String,
        required: true,
        unique: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    orderNumber: {
        type: String,
        required: true
    },
    logisticPartnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LogisticPartner',
        required: true
    },
    logisticPartnerName: {
        type: String,
        required: true
    },
    awbNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    trackingId: {
        type: String,
        required: true,
        trim: true
    },
    trackingUrl: {
        type: String
    },
    dispatchDate: {
        type: Date,
        default: Date.now
    },
    estimatedDeliveryDate: {
        type: Date
    },
    actualDeliveryDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['dispatched', 'in-transit', 'out-for-delivery', 'delivered', 'failed', 'returned'],
        default: 'dispatched'
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    deliveryAddress: {
        type: String,
        required: true
    },
    productDetails: {
        type: String
    },
    weight: {
        type: Number
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    },
    notes: {
        type: String
    },
    dispatchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    dispatchedByName: {
        type: String
    },
    visibleInApp: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate unique dispatch ID before saving
dispatchSchema.pre('save', async function(next) {
    if (!this.dispatchId) {
        const count = await mongoose.model('Dispatch').countDocuments();
        this.dispatchId = `DSP${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Dispatch', dispatchSchema);
