const mongoose = require('mongoose');

const logisticPartnerSchema = new mongoose.Schema({
    partnerName: {
        type: String,
        required: true,
        trim: true
    },
    partnerCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    contactPerson: {
        type: String,
        required: true
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
    address: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        enum: ['express', 'standard', 'economy', 'same-day'],
        default: 'standard'
    },
    trackingUrl: {
        type: String,
        required: true
    },
    // API Integration (for ShipRocket, etc.)
    apiIntegration: {
        enabled: {
            type: Boolean,
            default: false
        },
        apiType: {
            type: String,
            enum: ['shiprocket', 'delhivery', 'blue-dart', 'fedex', 'dhl', 'custom'],
            default: 'custom'
        },
        apiEndpoint: {
            type: String,
            default: ''
        },
        apiKey: {
            type: String,
            default: ''
        },
        apiSecret: {
            type: String,
            default: ''
        },
        webhookUrl: {
            type: String,
            default: ''
        },
        trackingEndpoint: {
            type: String,
            default: ''
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    totalDeliveries: {
        type: Number,
        default: 0
    },
    activeDeliveries: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LogisticPartner', logisticPartnerSchema);
