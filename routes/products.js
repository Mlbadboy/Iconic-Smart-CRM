const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

// Cache for products to avoid repeated scraping
let productsCache = {
    data: [],
    lastFetched: null,
    ttl: 3600000 // 1 hour
};

// Fetch products from iconicsmart.in
router.get('/fetch-from-website', auth, async (req, res) => {
    try {
        // Check cache first
        if (productsCache.data.length > 0 && 
            productsCache.lastFetched && 
            (Date.now() - productsCache.lastFetched < productsCache.ttl)) {
            console.log('📦 Returning cached products');
            return res.json({ 
                products: productsCache.data,
                cached: true,
                lastFetched: productsCache.lastFetched
            });
        }

        console.log('🌐 Fetching products from www.iconicsmart.in/category/all-products...');
        
        // Fetch the all-products page
        const response = await axios.get('https://www.iconicsmart.in/category/all-products', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const products = [];

        console.log('🔍 Parsing products from page...');

        // Try multiple common e-commerce selectors
        const selectors = [
            '.product',
            '.product-item',
            '.woocommerce-loop-product',
            '[class*="product-"]',
            '.item',
            '.product-card',
            '.shop-item',
            'article.product'
        ];

        let foundProducts = false;
        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`✅ Found ${elements.length} products with selector: ${selector}`);
                
                elements.each((i, element) => {
                    try {
                        const $elem = $(element);
                        
                        // Extract product name
                        const name = $elem.find('h2, h3, .product-title, .product-name, .woocommerce-loop-product__title, a[title]').first().text().trim() ||
                                    $elem.find('a').first().attr('title') ||
                                    $elem.find('a').first().text().trim();
                        
                        // Extract price - try multiple formats
                        let priceText = $elem.find('.price, .amount, .woocommerce-Price-amount, .product-price, [class*="price"]').first().text().trim();
                        
                        // Handle price ranges (take the first price)
                        if (priceText.includes('–') || priceText.includes('-')) {
                            priceText = priceText.split(/–|-/)[0].trim();
                        }
                        
                        // Extract numeric price
                        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
                        
                        // Extract image
                        const image = $elem.find('img').first().attr('src') || 
                                     $elem.find('img').first().attr('data-src') || '';
                        
                        // Extract product link for ID
                        const link = $elem.find('a').first().attr('href') || '';
                        const productId = link.split('/').pop() || `PROD${String(i + 1).padStart(5, '0')}`;
                        
                        // Extract SKU if available
                        const sku = $elem.attr('data-product-sku') || 
                                   $elem.attr('data-sku') || 
                                   $elem.find('[class*="sku"]').text().trim() ||
                                   productId;

                        const product = {
                            id: productId,
                            sku: sku,
                            name: name,
                            price: price,
                            image: image.startsWith('http') ? image : `https://www.iconicsmart.in${image}`,
                            description: $elem.find('.description, .short-description').first().text().trim() || '',
                            category: 'Iconic Smart Products',
                            inStock: true,
                            link: link.startsWith('http') ? link : `https://www.iconicsmart.in${link}`
                        };

                        if (product.name && product.price > 0) {
                            products.push(product);
                        }
                    } catch (err) {
                        console.error('Error parsing product:', err.message);
                    }
                });
                
                foundProducts = true;
                break;
            }
        }

        if (!foundProducts) {
            console.log('⚠️ No products found with standard selectors, trying alternate parsing...');
            
            // Try parsing any element with price information
            $('[class*="price"]').parent().each((i, element) => {
                try {
                    const $elem = $(element);
                    const name = $elem.text().split('₹')[0].trim();
                    const priceText = $elem.text().match(/₹\s*([0-9,]+)/);
                    const price = priceText ? parseFloat(priceText[1].replace(/,/g, '')) : 0;
                    
                    if (name && price > 0 && name.length > 3) {
                        products.push({
                            id: `PROD${String(i + 1).padStart(5, '0')}`,
                            sku: `ICON-${String(i + 1).padStart(3, '0')}`,
                            name: name,
                            price: price,
                            image: '',
                            description: '',
                            category: 'Iconic Smart Products',
                            inStock: true
                        });
                    }
                } catch (err) {
                    // Ignore parsing errors
                }
            });
        }

        // If still no products found, return sample products
        if (products.length === 0) {
            console.log('⚠️ No products found via scraping, using comprehensive sample products');
            products.push(
                {
                    id: 'ICON001',
                    sku: 'LED-9W-001',
                    name: 'Iconic Smart LED Bulb 9W',
                    price: 299,
                    image: 'https://www.iconicsmart.in/images/led-bulb.jpg',
                    description: 'Energy efficient LED bulb',
                    category: 'Lighting',
                    inStock: true
                },
                {
                    id: 'ICON002',
                    sku: 'SW-3M-001',
                    name: 'Iconic Smart Switch 3 Module',
                    price: 599,
                    image: 'https://www.iconicsmart.in/images/switch.jpg',
                    description: 'Premium quality smart switch',
                    category: 'Switches',
                    inStock: true
                },
                {
                    id: 'ICON003',
                    sku: 'SKT-001',
                    name: 'Iconic Smart Socket',
                    price: 399,
                    image: 'https://www.iconicsmart.in/images/socket.jpg',
                    description: 'Universal smart socket',
                    category: 'Sockets',
                    inStock: true
                },
                {
                    id: 'ICON004',
                    sku: 'REG-001',
                    name: 'Iconic Fan Regulator',
                    price: 249,
                    image: 'https://www.iconicsmart.in/images/regulator.jpg',
                    description: 'Step-type fan regulator',
                    category: 'Regulators',
                    inStock: true
                },
                {
                    id: 'ICON005',
                    sku: 'MCB-32A-001',
                    name: 'Iconic MCB 32A',
                    price: 199,
                    image: 'https://www.iconicsmart.in/images/mcb.jpg',
                    description: 'Miniature Circuit Breaker',
                    category: 'Protection',
                    inStock: true
                }
            );
        }

        // Update cache
        productsCache.data = products;
        productsCache.lastFetched = Date.now();

        console.log(`✅ Fetched ${products.length} products from iconicsmart.in`);
        
        res.json({ 
            products,
            cached: false,
            lastFetched: productsCache.lastFetched,
            count: products.length,
            source: products.length > 5 ? 'website' : 'sample'
        });

    } catch (error) {
        console.error('❌ Error fetching products:', error.message);
        
        // Return sample products on error
        const sampleProducts = [
            {
                id: 'ICON001',
                name: 'Iconic Smart LED Bulb 9W',
                price: 299,
                image: 'https://via.placeholder.com/150',
                description: 'Energy efficient LED bulb',
                category: 'Lighting',
                inStock: true,
                sku: 'LED-9W-001'
            },
            {
                id: 'ICON002',
                name: 'Iconic Smart Switch 3 Module',
                price: 599,
                image: 'https://via.placeholder.com/150',
                description: 'Premium quality smart switch',
                category: 'Switches',
                inStock: true,
                sku: 'SW-3M-001'
            },
            {
                id: 'ICON003',
                name: 'Iconic Smart Socket',
                price: 399,
                image: 'https://via.placeholder.com/150',
                description: 'Universal smart socket',
                category: 'Sockets',
                inStock: true,
                sku: 'SKT-001'
            },
            {
                id: 'ICON004',
                name: 'Iconic Fan Regulator',
                price: 249,
                image: 'https://via.placeholder.com/150',
                description: 'Step-type fan regulator',
                category: 'Regulators',
                inStock: true,
                sku: 'REG-001'
            },
            {
                id: 'ICON005',
                name: 'Iconic MCB 32A',
                price: 199,
                image: 'https://via.placeholder.com/150',
                description: 'Miniature Circuit Breaker',
                category: 'Protection',
                inStock: true,
                sku: 'MCB-32A-001'
            }
        ];
        
        res.json({ 
            products: sampleProducts,
            error: 'Using sample products due to fetch error',
            cached: false,
            count: sampleProducts.length
        });
    }
});

// Get cached products (fast)
router.get('/cached', auth, (req, res) => {
    res.json({
        products: productsCache.data,
        lastFetched: productsCache.lastFetched,
        count: productsCache.data.length
    });
});

// Clear products cache
router.post('/clear-cache', auth, (req, res) => {
    productsCache.data = [];
    productsCache.lastFetched = null;
    res.json({ message: 'Product cache cleared' });
});

// ========== DATABASE PRODUCT MANAGEMENT ==========

// Get all products from database
router.get('/', auth, async (req, res) => {
    try {
        const products = await Product.find({ active: true }).sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single product
router.get('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create product
router.post('/', auth, async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        console.log(`✅ Product Created: ${product.name} (${product.sku})`);
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update product
router.put('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete/deactivate product
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deactivated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk import products
router.post('/bulk-import', auth, async (req, res) => {
    try {
        const { products } = req.body;
        
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ 
                success: 0,
                errors: 1,
                created: [],
                errors: [{ product: 'Request', error: 'No products provided or invalid format' }]
            });
        }

        const created = [];
        const errorList = [];

        console.log('📦 Bulk import request received with', products.length, 'products');

        // Process products sequentially to avoid productId conflicts
        for (const productData of products) {
            try {
                console.log('Processing product:', productData.name, productData.sku);

                // Validate required fields
                if (!productData.name || !productData.sku || productData.price === undefined || productData.price === null) {
                    errorList.push({
                        product: productData.name || 'Unknown',
                        error: 'Missing required fields: name, sku, or price'
                    });
                    continue;
                }

                // Validate price is a number
                const price = Number(productData.price);
                if (isNaN(price) || price <= 0) {
                    errorList.push({
                        product: productData.name,
                        error: `Invalid price: ${productData.price}`
                    });
                    continue;
                }

                // Check if SKU already exists
                const existing = await Product.findOne({ sku: productData.sku });
                if (existing) {
                    errorList.push({
                        product: productData.name,
                        error: `SKU '${productData.sku}' already exists`
                    });
                    continue;
                }

                // Prepare product data with defaults - ensure all required fields are present
                const productToCreate = {
                    name: productData.name.trim(),
                    sku: productData.sku.trim(),
                    price: price,
                    category: productData.category || 'Other',
                    brand: productData.brand || 'Generic',
                    description: productData.description || '',
                    mrp: productData.mrp || (price * 1.2),
                    inStock: productData.inStock !== undefined ? productData.inStock : true,
                    stockQuantity: productData.stockQuantity || 10,
                    active: true
                };

                const product = new Product(productToCreate);
                await product.save();
                created.push({
                    id: product._id,
                    name: product.name,
                    sku: product.sku,
                    price: product.price
                });

                console.log('✅ Product created successfully:', product.name, `(${product.sku})`);
            } catch (error) {
                console.error('❌ Error creating product:', productData.name, error.message);
                errorList.push({
                    product: productData.name || productData.sku || 'Unknown',
                    error: error.message || 'Unknown error'
                });
            }
        }

        console.log(`✅ Bulk Import Complete: ${created.length} products created, ${errorList.length} errors`);

        // Always return the expected format, even if there are errors
        res.json({
            success: created.length,
            errors: errorList.length,
            created: created,
            errors: errorList
        });
    } catch (error) {
        console.error('❌ Bulk import error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(400).json({ 
            success: 0,
            errors: 1,
            created: [],
            errors: [{ product: 'System', error: error.message || 'Unknown error occurred' }]
        });
    }
});

// Initialize with sample Iconic Smart products
router.post('/initialize-sample', auth, async (req, res) => {
    try {
        const sampleProducts = [
            {
                sku: 'LED-9W-001',
                name: 'Iconic Smart LED Bulb 9W',
                description: 'Energy efficient LED bulb with warm white light, 900 lumens',
                category: 'Lighting',
                price: 299,
                mrp: 399,
                brand: 'Iconic Smart',
                warranty: '1 Year',
                inStock: true,
                stockQuantity: 100,
                specifications: [
                    { key: 'Wattage', value: '9W' },
                    { key: 'Lumens', value: '900 lm' },
                    { key: 'Color', value: 'Warm White' }
                ]
            },
            {
                sku: 'SW-3M-001',
                name: 'Iconic Smart Switch 3 Module',
                description: 'Premium quality 3-module switch with elegant design',
                category: 'Switches',
                price: 599,
                mrp: 799,
                brand: 'Iconic Smart',
                warranty: '2 Years',
                inStock: true,
                stockQuantity: 50,
                specifications: [
                    { key: 'Modules', value: '3' },
                    { key: 'Material', value: 'Polycarbonate' },
                    { key: 'Color', value: 'White' }
                ]
            },
            {
                sku: 'SKT-001',
                name: 'Iconic Smart Socket',
                description: 'Universal smart socket with safety shutters',
                category: 'Sockets',
                price: 399,
                mrp: 499,
                brand: 'Iconic Smart',
                warranty: '2 Years',
                inStock: true,
                stockQuantity: 75,
                specifications: [
                    { key: 'Type', value: '3-Pin' },
                    { key: 'Rating', value: '16A' },
                    { key: 'Safety', value: 'Child Protection' }
                ]
            },
            {
                sku: 'REG-001',
                name: 'Iconic Fan Regulator',
                description: 'Step-type fan regulator with smooth operation',
                category: 'Regulators',
                price: 249,
                mrp: 349,
                brand: 'Iconic Smart',
                warranty: '1 Year',
                inStock: true,
                stockQuantity: 60,
                specifications: [
                    { key: 'Type', value: 'Step' },
                    { key: 'Ratings', value: '100W' }
                ]
            },
            {
                sku: 'MCB-32A-001',
                name: 'Iconic MCB 32A',
                description: 'Miniature Circuit Breaker for electrical protection',
                category: 'Protection',
                price: 199,
                mrp: 299,
                brand: 'Iconic Smart',
                warranty: '5 Years',
                inStock: true,
                stockQuantity: 40,
                specifications: [
                    { key: 'Rating', value: '32A' },
                    { key: 'Poles', value: 'Single Pole' },
                    { key: 'Breaking Capacity', value: '6kA' }
                ]
            }
        ];

        const created = [];
        for (const productData of sampleProducts) {
            // Check if product already exists
            const existing = await Product.findOne({ sku: productData.sku });
            if (!existing) {
                const product = new Product(productData);
                await product.save();
                created.push(product);
            }
        }

        console.log(`✅ Initialized ${created.length} sample products`);
        res.json({
            message: `${created.length} sample products initialized`,
            products: created
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
