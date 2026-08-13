const mongoose = require('mongoose');

const serviceCenterSchema = new mongoose.Schema({
    name: {
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
        trim: true
    },
    address: {
        type: String,
        required: true
    },
    gstNumber: {
        type: String,
        required: true,
        trim: true
    },
    servicesOffered: [{
        type: String,
        enum: ['installation', 'repair'],
        required: true
    }],
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ServiceCenter', serviceCenterSchema);
