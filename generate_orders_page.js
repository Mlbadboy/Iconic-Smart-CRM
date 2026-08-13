const fs = require('fs');

const ordersHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Order - Iconic Smart CRM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f7fafc;
            color: #2d3748;
        }
        .header {
            background: white;
            border-bottom: 2px solid #e2e8f0;
            padding: 1rem 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo { font-size: 1.5rem; font-weight: bold; color: #667eea; }
        .nav { display: flex; gap: 1rem; }
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #f7fafc; color: #2d3748; border: 1px solid #e2e8f0; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .container {
            max-width: 1400px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        .page-header {
            margin-bottom: 2rem;
        }
        .page-header h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #2d3748;
        }
        .form-group select,
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
        }
        .form-group select:focus,
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .retailer-info {
            background: #f7fafc;
            padding: 1.5rem;
            border-radius: 8px;
            margin-top: 1rem;
        }
        .retailer-info .info-row {
            display: grid;
            grid-template-columns: 150px 1fr;
            margin-bottom: 0.5rem;
        }
        .retailer-info .info-row strong {
            color: #4a5568;
        }
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .product-card {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .product-card:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }
        .product-card.selected {
            border-color: #667eea;
            background: #eef2ff;
        }
        .product-card h4 {
            margin-bottom: 0.5rem;
            color: #2d3748;
        }
        .product-card .price {
            font-size: 1.25rem;
            font-weight: bold;
            color: #667eea;
            margin: 0.5rem 0;
        }
        .product-card .sku {
            font-size: 0.85rem;
            color: #718096;
        }
        .quantity-input {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        .quantity-input button {
            width: 30px;
            height: 30px;
            border: none;
            background: #667eea;
            color: white;
            border-radius: 4px;
            cursor: pointer;
        }
        .quantity-input input {
            width: 60px;
            text-align: center;
            padding: 0.25rem;
        }
        .order-summary {
            background: #f7fafc;
            padding: 1.5rem;
            border-radius: 8px;
            position: sticky;
            top: 2rem;
        }
        .order-summary h3 {
            margin-bottom: 1rem;
            color: #2d3748;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.75rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #e2e8f0;
        }
        .summary-row.total {
            border-top: 2px solid #667eea;
            border-bottom: none;
            padding-top: 0.75rem;
            font-size: 1.25rem;
            font-weight: bold;
            color: #667eea;
        }
        .selected-items {
            margin-bottom: 1rem;
        }
        .selected-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: white;
            border-radius: 6px;
            margin-bottom: 0.5rem;
        }
        .selected-item .remove-btn {
            background: #fc8181;
            color: white;
            border: none;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            cursor: pointer;
        }
        .loading {
            text-align: center;
            padding: 3rem;
        }
        .spinner {
            border: 3px solid #e2e8f0;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .toast {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #2d3748;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: none;
            z-index: 1000;
        }
        .toast.show {
            display: block;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo">🚀 Iconic Smart CRM</div>
            <div class="nav">
                <a href="/dashboard.html" class="btn btn-secondary">← Back to Dashboard</a>
                <button class="btn btn-primary" onclick="logout()">Logout</button>
            </div>
        </div>
    </header>

    <div class="container">
        <div class="page-header">
            <h1>📦 Create New Order</h1>
            <p>Select retailer, add products, and generate invoice</p>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            <div>
                <!-- Retailer Selection -->
                <div class="card">
                    <h2 style="margin-bottom: 1rem;">1️⃣ Select Retailer</h2>
                    <div class="form-group">
                        <label>Retailer Name *</label>
                        <select id="retailerSelect" onchange="loadRetailerDetails()">
                            <option value="">-- Select Retailer --</option>
                        </select>
                    </div>
                    
                    <div id="retailerInfo" class="retailer-info" style="display: none;">
                        <h3 style="margin-bottom: 1rem;">Retailer Information</h3>
                        <div class="info-row">
                            <strong>Email:</strong>
                            <span id="retailerEmail"></span>
                        </div>
                        <div class="info-row">
                            <strong>Phone:</strong>
                            <span id="retailerPhone"></span>
                        </div>
                        <div class="info-row">
                            <strong>GST Number:</strong>
                            <span id="retailerGST"></span>
                        </div>
                        <div class="info-row">
                            <strong>Total Orders:</strong>
                            <span id="retailerOrders"></span>
                        </div>
                        <div class="info-row">
                            <strong>Last Order:</strong>
                            <span id="retailerLastOrder"></span>
                        </div>
                    </div>
                </div>

                <!-- Product Selection -->
                <div class="card">
                    <h2 style="margin-bottom: 1rem;">2️⃣ Select Products</h2>
                    <button class="btn btn-primary" onclick="loadProducts()" style="margin-bottom: 1rem;">
                        🔄 Load Products from iconicsmart.in
                    </button>
                    
                    <div id="productsLoading" class="loading" style="display: none;">
                        <div class="spinner"></div>
                        <p>Loading products...</p>
                    </div>
                    
                    <div id="productsGrid" class="products-grid"></div>
                </div>
            </div>

            <!-- Order Summary -->
            <div>
                <div class="order-summary">
                    <h3>📋 Order Summary</h3>
                    
                    <div id="selectedItems" class="selected-items"></div>
                    
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span id="subtotal">₹0.00</span>
                    </div>
                    <div class="summary-row">
                        <span>GST (18%):</span>
                        <span id="gst">₹0.00</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total Amount:</span>
                        <span id="total">₹0.00</span>
                    </div>
                    
                    <button class="btn btn-primary" onclick="createOrder()" 
                            style="width: 100%; margin-top: 1rem;" id="createOrderBtn" disabled>
                        🧾 Generate Invoice & Create Order
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="toast" class="toast"></div>

    <script>
        const API_URL = 'http://localhost:7000/api';
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            window.location.href = '/login.html';
        }

        let selectedRetailer = null;
        let selectedProducts = [];
        let allProducts = [];

        // Show toast notification
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        // Load retailers
        async function loadRetailers() {
            try {
                const response = await fetch(\`\${API_URL}/retailers\`, {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                });
                const retailers = await response.json();
                
                const select = document.getElementById('retailerSelect');
                retailers.forEach(retailer => {
                    const option = document.createElement('option');
                    option.value = retailer._id;
                    option.textContent = retailer.retailerName;
                    option.dataset.retailer = JSON.stringify(retailer);
                    select.appendChild(option);
                });
            } catch (error) {
                showToast('Failed to load retailers');
                console.error(error);
            }
        }

        // Load retailer details
        function loadRetailerDetails() {
            const select = document.getElementById('retailerSelect');
            const selected = select.options[select.selectedIndex];
            
            if (!selected.value) {
                document.getElementById('retailerInfo').style.display = 'none';
                selectedRetailer = null;
                return;
            }
            
            selectedRetailer = JSON.parse(selected.dataset.retailer);
            
            document.getElementById('retailerEmail').textContent = selectedRetailer.email;
            document.getElementById('retailerPhone').textContent = selectedRetailer.phone;
            document.getElementById('retailerGST').textContent = selectedRetailer.gstNumber || 'N/A';
            document.getElementById('retailerOrders').textContent = selectedRetailer.totalOrders || 0;
            document.getElementById('retailerLastOrder').textContent = selectedRetailer.lastOrderDate ? 
                new Date(selectedRetailer.lastOrderDate).toLocaleDateString() : 'N/A';
            
            document.getElementById('retailerInfo').style.display = 'block';
        }

        // Load products from iconicsmart.in
        async function loadProducts() {
            const loading = document.getElementById('productsLoading');
            const grid = document.getElementById('productsGrid');
            
            loading.style.display = 'block';
            grid.innerHTML = '';
            
            try {
                const response = await fetch(\`\${API_URL}/products/fetch-from-website\`, {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                });
                const data = await response.json();
                
                allProducts = data.products;
                loading.style.display = 'none';
                
                displayProducts(allProducts);
                showToast(\`Loaded \${allProducts.length} products\`);
            } catch (error) {
                loading.style.display = 'none';
                showToast('Failed to load products');
                console.error(error);
            }
        }

        // Display products
        function displayProducts(products) {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = products.map(product => \`
                <div class="product-card" onclick="toggleProduct('\${product.id}')">
                    <h4>\${product.name}</h4>
                    <div class="sku">SKU: \${product.sku || product.id}</div>
                    <div class="price">₹\${product.price.toFixed(2)}</div>
                    <div class="quantity-input" onclick="event.stopPropagation()">
                        <button onclick="changeQuantity('\${product.id}', -1)">-</button>
                        <input type="number" id="qty_\${product.id}" value="1" min="1" max="999" 
                               onchange="updateQuantity('\${product.id}')">
                        <button onclick="changeQuantity('\${product.id}', 1)">+</button>
                    </div>
                </div>
            \`).join('');
        }

        // Toggle product selection
        function toggleProduct(productId) {
            const product = allProducts.find(p => p.id === productId);
            const existing = selectedProducts.find(p => p.id === productId);
            
            if (existing) {
                selectedProducts = selectedProducts.filter(p => p.id !== productId);
            } else {
                const quantity = parseInt(document.getElementById(\`qty_\${productId}\`).value) || 1;
                selectedProducts.push({ ...product, quantity });
            }
            
            updateUI();
        }

        // Change quantity
        function changeQuantity(productId, delta) {
            const input = document.getElementById(\`qty_\${productId}\`);
            const newValue = Math.max(1, parseInt(input.value) + delta);
            input.value = newValue;
            updateQuantity(productId);
        }

        // Update quantity
        function updateQuantity(productId) {
            const product = selectedProducts.find(p => p.id === productId);
            if (product) {
                product.quantity = parseInt(document.getElementById(\`qty_\${productId}\`).value);
                updateSummary();
            }
        }

        // Update UI
        function updateUI() {
            // Update product cards
            document.querySelectorAll('.product-card').forEach(card => {
                const onclick = card.getAttribute('onclick');
                const productId = onclick.match(/'([^']+)'/)[1];
                const isSelected = selectedProducts.some(p => p.id === productId);
                card.classList.toggle('selected', isSelected);
            });
            
            updateSummary();
        }

        // Update summary
        function updateSummary() {
            const itemsDiv = document.getElementById('selectedItems');
            itemsDiv.innerHTML = selectedProducts.map(product => \`
                <div class="selected-item">
                    <div>
                        <strong>\${product.name}</strong><br>
                        <small>\${product.quantity} × ₹\${product.price.toFixed(2)} = ₹\${(product.quantity * product.price).toFixed(2)}</small>
                    </div>
                    <button class="remove-btn" onclick="toggleProduct('\${product.id}')">Remove</button>
                </div>
            \`).join('') || '<p style="text-align: center; color: #718096;">No items selected</p>';
            
            const subtotal = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
            const gst = subtotal * 0.18;
            const total = subtotal + gst;
            
            document.getElementById('subtotal').textContent = \`₹\${subtotal.toFixed(2)}\`;
            document.getElementById('gst').textContent = \`₹\${gst.toFixed(2)}\`;
            document.getElementById('total').textContent = \`₹\${total.toFixed(2)}\`;
            
            document.getElementById('createOrderBtn').disabled = !selectedRetailer || selectedProducts.length === 0;
        }

        // Create order
        async function createOrder() {
            if (!selectedRetailer) {
                showToast('Please select a retailer');
                return;
            }
            
            if (selectedProducts.length === 0) {
                showToast('Please select at least one product');
                return;
            }
            
            const btn = document.getElementById('createOrderBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Creating Order...';
            
            try {
                const orderData = {
                    retailerId: selectedRetailer._id,
                    items: selectedProducts.map(p => ({
                        productId: p.id,
                        sku: p.sku || p.id,
                        name: p.name,
                        quantity: p.quantity,
                        price: p.price
                    })),
                    gstRate: 18,
                    billingAddress: selectedRetailer.billingAddress,
                    shippingAddress: selectedRetailer.shippingAddress,
                    paymentMethod: 'pending'
                };
                
                const response = await fetch(\`\${API_URL}/orders\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                    },
                    body: JSON.stringify(orderData)
                });
                
                const order = await response.json();
                
                if (response.ok) {
                    showToast('✅ Order created successfully!');
                    
                    // Generate invoice PDF
                    setTimeout(() => {
                        window.open(\`\${API_URL}/invoices/generate/\${order._id}\`, '_blank');
                        showToast('📄 Generating invoice PDF...');
                    }, 1000);
                    
                    // Reset form
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    throw new Error(order.message);
                }
            } catch (error) {
                showToast('❌ Failed to create order');
                console.error(error);
                btn.disabled = false;
                btn.textContent = '🧾 Generate Invoice & Create Order';
            }
        }

        function logout() {
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
        }

        // Initialize
        window.addEventListener('DOMContentLoaded', () => {
            loadRetailers();
        });
    </script>
</body>
</html>`;

fs.writeFileSync('public/orders.html', ordersHtml);
console.log('✅ orders.html created successfully!');
