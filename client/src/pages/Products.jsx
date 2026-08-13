// File: client/src/pages/Products.jsx
// Main products page with list/create toggle

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductList from '../components/products/ProductList';
import ProductForm from '../components/products/ProductForm';
import { Plus, List, ArrowLeft } from 'lucide-react';

export default function Products() {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list', 'create', or 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setView('edit');
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setView('create');
  };

  const handleSuccess = () => {
    setView('list');
    setSelectedProduct(null);
  };

  const handleCancel = () => {
    setView('list');
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <p className="text-sm text-gray-600">
                  {view === 'list' 
                    ? 'Product catalog management' 
                    : view === 'create'
                    ? 'Add new product'
                    : 'Edit product'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
              >
                <List className="w-4 h-4" />
                View Products
              </button>
              {(view === 'create' || view === 'edit') && (
                <button
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'list' ? (
          <ProductList 
            onEdit={handleEdit}
            onCreateClick={handleCreate}
          />
        ) : (
          <ProductForm
            product={selectedProduct}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
      </main>
    </div>
  );
}
