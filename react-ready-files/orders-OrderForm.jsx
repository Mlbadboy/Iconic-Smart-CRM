// File: client/src/components/orders/OrderForm.jsx
// Complete order creation form with product selection and real-time totals

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, retailerService, productService } from '../../services/orderService';
import { formatCurrency, calculateTotalWithGST } from '../../lib/utils';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Plus, Minus, Trash2, ShoppingCart, Search, X, CheckCircle } from 'lucide-react';

export default function OrderForm({ onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gstRate, setGstRate] = useState(18);

  // Fetch retailers
  const { data: retailers, isLoading: loadingRetailers } = useQuery({
    queryKey: ['retailers'],
    queryFn: retailerService.getRetailers,
  });

  // Fetch products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      alert('✅ Order created successfully!');
      // Reset form
      setSelectedRetailer('');
      setSelectedProducts([]);
      setSearchTerm('');
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      alert('❌ Failed to create order: ' + (error.response?.data?.message || error.message));
    },
  });

  // Calculate totals
  const subtotal = selectedProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const { gstAmount, total } = calculateTotalWithGST(subtotal, gstRate);

  // Filter products by search
  const filteredProducts = products?.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get selected retailer details
  const retailer = retailers?.find(r => r._id === selectedRetailer);

  // Add product to cart
  const addProduct = (product) => {
    const existing = selectedProducts.find(p => p.productId === product.productId || p._id === product._id);
    if (existing) {
      updateQuantity(product.productId || product._id, existing.quantity + 1);
    } else {
      setSelectedProducts([...selectedProducts, { 
        ...product, 
        quantity: 1,
        productId: product.productId || product._id 
      }]);
    }
  };

  // Update product quantity
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(selectedProducts.map(p =>
      (p.productId === productId || p._id === productId) ? { ...p, quantity: newQuantity } : p
    ));
  };

  // Remove product
  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId && p._id !== productId));
  };

  // Clear cart
  const clearCart = () => {
    if (window.confirm('Clear all products from cart?')) {
      setSelectedProducts([]);
    }
  };

  // Submit order
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedRetailer) {
      alert('⚠️ Please select a retailer');
      return;
    }

    if (selectedProducts.length === 0) {
      alert('⚠️ Please add at least one product');
      return;
    }

    const orderData = {
      retailerId: selectedRetailer,
      items: selectedProducts.map(p => ({
        productId: p.productId || p._id,
        sku: p.sku,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
      })),
      gstRate,
    };

    createOrderMutation.mutate(orderData);
  };

  if (loadingRetailers || loadingProducts) {
    return <LoadingSpinner text="Loading form data..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <Step number={1} label="Select Retailer" active={!selectedRetailer} completed={!!selectedRetailer} />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full ${selectedRetailer ? 'bg-primary' : 'bg-gray-200'} transition-all`} 
                 style={{ width: selectedRetailer ? '100%' : '0%' }}></div>
          </div>
          <Step number={2} label="Add Products" active={selectedRetailer && selectedProducts.length === 0} completed={selectedProducts.length > 0} />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full ${selectedProducts.length > 0 ? 'bg-primary' : 'bg-gray-200'} transition-all`}
                 style={{ width: selectedProducts.length > 0 ? '100%' : '0%' }}></div>
          </div>
          <Step number={3} label="Review & Submit" active={selectedProducts.length > 0} completed={false} />
        </div>
      </div>

      {/* Step 1: Select Retailer */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">1</span>
          Select Retailer
        </h2>
        
        <select
          value={selectedRetailer}
          onChange={(e) => setSelectedRetailer(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          required
        >
          <option value="">Choose a retailer...</option>
          {retailers?.map((retailer) => (
            <option key={retailer._id} value={retailer._id}>
              {retailer.retailerName} - {retailer.email}
              {retailer.gstNumber ? ` (GST: ${retailer.gstNumber})` : ''}
            </option>
          ))}
        </select>

        {/* Retailer Details */}
        {retailer && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">Retailer Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium">{retailer.retailerName}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{retailer.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="font-medium">{retailer.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">GST Number</p>
                <p className="font-medium">{retailer.gstNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Orders</p>
                <p className="font-medium">{retailer.totalOrders || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Amount</p>
                <p className="font-medium">{formatCurrency(retailer.totalAmount || 0)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Select Products */}
      {selectedRetailer && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">2</span>
              Select Products
            </h2>
            {selectedProducts.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cart
              </button>
            )}
          </div>

          {/* Search Products */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const isSelected = selectedProducts.find(p => p.productId === product.productId || p._id === product._id);
                return (
                  <div 
                    key={product.productId || product._id} 
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    {product.image && (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-medium mb-1 text-gray-900">{product.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">SKU: {product.sku}</p>
                    {product.category && (
                      <p className="text-xs text-gray-500 mb-2">Category: {product.category}</p>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                      {product.inStock !== false && (
                        <span className="text-xs text-green-600">In Stock</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      className={`w-full btn ${isSelected ? 'btn-secondary' : 'btn-primary'} text-sm flex items-center justify-center gap-1`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Added (Qty: {isSelected.quantity})
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                {searchTerm ? 'No products found matching your search' : 'No products available'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Cart & Summary */}
      {selectedProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">3</span>
            Review Cart ({selectedProducts.length} items)
          </h2>

          {/* Cart Items */}
          <div className="space-y-3 mb-6">
            {selectedProducts.map((item) => (
              <div key={item.productId || item._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-600">SKU: {item.sku} • {formatCurrency(item.price)} each</p>
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId || item._id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId || item._id, parseInt(e.target.value) || 1)}
                    className="w-16 text-center px-2 py-1 border border-gray-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId || item._id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right min-w-[100px]">
                  <p className="font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeProduct(item.productId || item._id)}
                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            
            {/* GST Rate Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate (%)</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value={0}>0% - No GST</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST (Standard)</option>
                <option value={28}>28% GST</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal ({selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} items):</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>GST ({gstRate}%):</span>
                <span className="font-semibold">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-primary border-t-2 border-primary pt-3">
                <span>Total Amount:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary flex-1"
            disabled={createOrderMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createOrderMutation.isPending || !selectedRetailer || selectedProducts.length === 0}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {createOrderMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Order...
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Create Order ({formatCurrency(total)})
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// Progress Step Component
function Step({ number, label, active, completed }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
        completed ? 'bg-green-500 border-green-500 text-white' :
        active ? 'bg-primary border-primary text-white' :
        'bg-white border-gray-300 text-gray-400'
      }`}>
        {completed ? <CheckCircle className="w-6 h-6" /> : number}
      </div>
      <span className={`text-xs mt-2 font-medium ${active || completed ? 'text-primary' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
