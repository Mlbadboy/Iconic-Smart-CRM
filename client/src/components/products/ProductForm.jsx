// File: client/src/components/products/ProductForm.jsx
// Add/Edit product form

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { Package, DollarSign, Box, Tag } from 'lucide-react';

export default function ProductForm({ product, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const isEditMode = !!product;

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    category: product?.category || 'LED TV',
    brand: product?.brand || 'Iconic Smart',
    price: product?.price || '',
    mrp: product?.mrp || '',
    image: product?.image || '',
    inStock: product?.inStock ?? true,
    stockQuantity: product?.stockQuantity || '',
    unit: product?.unit || 'pcs',
    specifications: product?.specifications || {},
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data) => 
      isEditMode 
        ? productService.updateProduct(product._id, data)
        : productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      alert(isEditMode ? '✅ Product updated successfully!' : '✅ Product created successfully!');
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      alert('❌ Failed to save product: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter product name');
      return;
    }

    if (!formData.price || formData.price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    if (formData.mrp && parseFloat(formData.price) > parseFloat(formData.mrp)) {
      alert('Price cannot be greater than MRP');
      return;
    }

    mutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>
        <p className="text-gray-600">
          {isEditMode ? 'Update product information' : 'Fill in the product details'}
        </p>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              placeholder="e.g., LED-TV-32"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., LED TV 32 inch"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="LED TV">LED TV</option>
              <option value="Washing Machine">Washing Machine</option>
              <option value="Refrigerator">Refrigerator</option>
              <option value="Audio System">Audio System</option>
              <option value="Air Cooler">Air Cooler</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g., Iconic Smart"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Image URL */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {formData.image && (
              <img 
                src={formData.image} 
                alt="Preview"
                className="mt-2 h-32 rounded border"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Pricing
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selling Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="15000"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* MRP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MRP (₹)
            </label>
            <input
              type="number"
              name="mrp"
              value={formData.mrp}
              onChange={handleChange}
              placeholder="20000"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum Retail Price (optional)
            </p>
          </div>
        </div>

        {/* Price Summary */}
        {formData.price && formData.mrp && parseFloat(formData.mrp) > parseFloat(formData.price) && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-medium">Discount:</span> ₹
              {(parseFloat(formData.mrp) - parseFloat(formData.price)).toFixed(2)} (
              {Math.round(((parseFloat(formData.mrp) - parseFloat(formData.price)) / parseFloat(formData.mrp)) * 100)}% off)
            </p>
          </div>
        )}
      </div>

      {/* Stock Management */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Box className="w-5 h-5 text-primary" />
          Stock Management
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* In Stock Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="inStock"
              checked={formData.inStock}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-primary"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">
              In Stock
            </label>
          </div>

          {/* Stock Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Quantity
            </label>
            <input
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleChange}
              placeholder="50"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="box">Box</option>
              <option value="set">Set</option>
              <option value="unit">Unit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary flex-1"
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                {isEditMode ? 'Update Product' : 'Create Product'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
