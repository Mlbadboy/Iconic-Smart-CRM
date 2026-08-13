const mongoose = require('mongoose');
const { nextSequence } = require('../services/sequenceService');

const serviceRequestSchema = new mongoose.Schema({
    serviceId: {
        type: String,
        required: false, // Auto-generated in pre-save hook
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    serviceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCenter',
        required: true
    },
    serviceCenterName: {
        type: String,
        required: true
    },
    serviceCenterEmail: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        enum: ['installation', 'repair'],
        required: true
    },
    productType: {
        type: String,
        enum: ['LED TV', 'Washing Machine', 'Refrigerator', 'Audio', 'Cooler'],
        required: true
    },
    serialNumber: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    issueType: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignedTo: {
        type: String
    },
    orderRef: {
        type: String
    },
    emailSent: {
        type: Boolean,
        default: false
    },
    emailSentAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Generate concurrency-safe service ID before saving.
serviceRequestSchema.pre('save', async function(next) {
    if (!this.serviceId) {
        this.serviceId = await nextSequence('service-requests', { prefix: 'SR', pad: 6 });
    }
    next();
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
