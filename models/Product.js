const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productId: {
        type: String,
        unique: true,
        required: true
    },
    sku: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    category: {
        type: String,
        default: 'General'
    },
    price: {
        type: Number,
        required: true
    },
    mrp: Number,
    image: String,
    images: [String],
    specifications: [{
        key: String,
        value: String
    }],
    inStock: {
        type: Boolean,
        default: true
    },
    stockQuantity: {
        type: Number,
        default: 0
    },
    unit: {
        type: String,
        default: 'piece'
    },
    brand: {
        type: String,
        default: 'Iconic Smart'
    },
    warranty: String,
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate product ID before saving
productSchema.pre('save', async function(next) {
    if (!this.productId) {
        // Use a more robust ID generation to avoid conflicts
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        this.productId = `ICON${timestamp}${random}`;
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);
