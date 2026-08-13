const mongoose = require('mongoose');

const contentRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    festivalName: {
        type: String,
        required: true
    },
    festivalDate: {
        type: Date,
        required: true
    },
    contentType: {
        type: String,
        enum: ['image', 'video', 'post', 'campaign'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['normal', 'high', 'urgent'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['pending', 'assigned', 'in-progress', 'completed', 'rejected'],
        default: 'pending'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentManager'
    },
    assignedToName: {
        type: String
    },
    notes: {
        type: String
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Generate unique request ID before saving
contentRequestSchema.pre('save', async function(next) {
    if (!this.requestId) {
        const count = await mongoose.model('ContentRequest').countDocuments();
        this.requestId = `CR${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model('ContentRequest', contentRequestSchema);
