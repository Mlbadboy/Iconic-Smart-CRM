const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true
    },
    productId: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    materialCode: {
        type: String,
        trim: true,
        index: true
    },
    productCode: {
        type: String,
        trim: true,
        index: true
    },
    model: {
        type: String,
        trim: true
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

// Generate product ID before validation
productSchema.pre('validate', async function(next) {
    if (!this.productId) {
        // Use a more robust ID generation to avoid conflicts
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        this.productId = `ICON${timestamp}${random}`;
    }
    next();
});

productSchema.index({ companyId: 1, sku: 1 });
productSchema.index({ companyId: 1, active: 1 });

module.exports = mongoose.model('Product', productSchema);
