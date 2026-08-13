// File: client/src/components/products/ProductList.jsx
// Product list with grid view, search, and filters

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { isAdmin } from '../../lib/utils';
import ProductCard from './ProductCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Search, Filter, Plus, Download, Grid, List as ListIcon } from 'lucide-react';

export default function ProductList({ onEdit, onCreateClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const queryClient = useQueryClient();
  const admin = isAdmin();

  // Fetch products
  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  // Fetch from website mutation (admin only)
  const fetchFromWebMutation = useMutation({
    mutationFn: productService.fetchFromWebsite,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['products']);
      alert(`✅ Successfully fetched ${data.count || 0} products from website!`);
    },
    onError: (error) => {
      alert('❌ Failed to fetch products: ' + (error.response?.data?.message || error.message));
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      alert('✅ Product deleted successfully!');
    },
    onError: (error) => {
      alert('❌ Failed to delete product: ' + (error.response?.data?.message || error.message));
    },
  });

  // Filter products
  const filteredProducts = products?.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower);
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStock = 
      stockFilter === 'all' || 
      (stockFilter === 'in-stock' && product.inStock) ||
      (stockFilter === 'out-of-stock' && !product.inStock);
    
    return matchesSearch && matchesCategory && matchesStock;
  }) || [];

  // Get unique categories
  const categories = [...new Set(products?.map(p => p.category).filter(Boolean))];

  const handleDelete = (product) => {
    if (window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(product._id);
    }
  };

  const handleFetchFromWebsite = () => {
    if (window.confirm('Fetch products from iconicsmart.in website? This may take a few minutes.')) {
      fetchFromWebMutation.mutate();
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-red-600 mb-4">Error loading products: {error.message}</p>
        <button onClick={() => refetch()} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Products" value={products?.length || 0} color="blue" />
        <StatCard 
          label="In Stock" 
          value={products?.filter(p => p.inStock).length || 0} 
          color="green" 
        />
        <StatCard 
          label="Out of Stock" 
          value={products?.filter(p => !p.inStock).length || 0} 
          color="red" 
        />
        <StatCard 
          label="Categories" 
          value={categories.length} 
          color="purple" 
        />
      </div>

      {/* Search, Filters, and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name, SKU, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Stock Status</option>
            <option value="in-stock">In Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Actions */}
          {admin && (
            <>
              <button
                onClick={handleFetchFromWebsite}
                disabled={fetchFromWebMutation.isPending}
                className="btn btn-secondary flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                {fetchFromWebMutation.isPending ? 'Fetching...' : 'Fetch from Website'}
              </button>
              <button
                onClick={onCreateClick}
                className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* Product Grid/List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-2">No products found</p>
          <p className="text-gray-400 mb-6">
            {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add your first product to get started'}
          </p>
          {admin && onCreateClick && (
            <button onClick={onCreateClick} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2 inline" />
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onEdit={onEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Results Count */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Showing {filteredProducts.length} of {products?.length || 0} products
          </div>
        </>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    red: 'bg-red-100 text-red-600 border-red-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4">
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
