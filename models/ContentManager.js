const mongoose = require('mongoose');

const contentManagerSchema = new mongoose.Schema({
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
    responsibilities: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    assignedRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentRequest'
    }],
    completedCount: {
        type: Number,
        default: 0
    },
    pendingCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ContentManager', contentManagerSchema);
