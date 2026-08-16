// File: client/src/pages/Products.jsx
// Main products page with list/create toggle

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductList from '../components/products/ProductList';
import ProductForm from '../components/products/ProductForm';
import { Plus, List, ArrowLeft } from 'lucide-react';
import AppShell from '../components/layout/AppShell';

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
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">🏷️ Products</h2>
            <p className="text-slate-400 text-sm mt-1">
              {view === 'list' 
                ? 'Product catalog management' 
                : view === 'create'
                ? 'Add new product'
                : 'Edit product'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border text-sm transition-all ${
                view === 'list' 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-slate-100'
              }`}
            >
              <List className="w-4 h-4" />
              View Products
            </button>
            {(view === 'create' || view === 'edit') && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg font-semibold border text-sm bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-slate-100 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
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
        </div>
      </div>
    </AppShell>
  );
}
