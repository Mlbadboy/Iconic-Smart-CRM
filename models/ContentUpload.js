const mongoose = require('mongoose');

const contentUploadSchema = new mongoose.Schema({
    uploadId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    title: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    description: {
        type: String
    },
    targetAudience: {
        type: String,
        enum: ['all', 'dealers', 'customers'],
        default: 'all'
    },
    files: [{
        name: String,
        size: Number,
        type: String,
        url: String
    }],
    fileCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'pending-review', 'approved', 'published', 'rejected'],
        default: 'published'
    },
    publishedAt: {
        type: Date
    },
    visibleInApp: {
        type: Boolean,
        default: true
    },
    viewCount: {
        type: Number,
        default: 0
    },
    tags: [String]
}, {
    timestamps: true
});

// Generate unique upload ID before saving
contentUploadSchema.pre('save', async function(next) {
    if (!this.uploadId) {
        const count = await mongoose.model('ContentUpload').countDocuments();
        this.uploadId = `UP${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model('ContentUpload', contentUploadSchema);
