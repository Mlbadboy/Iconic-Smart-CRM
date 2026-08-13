// File: client/src/pages/Orders.jsx
// Main orders page with tabs

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, List, ArrowLeft } from 'lucide-react';
import OrderList from '../components/orders/OrderList';
import OrderForm from '../components/orders/OrderForm';

export default function Orders() {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' or 'create'

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
                <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                <p className="text-sm text-gray-600">
                  {view === 'list' ? 'Manage all orders' : 'Create new order'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
              >
                <List className="w-4 h-4" />
                View Orders
              </button>
              <button
                onClick={() => setView('create')}
                className={`btn ${view === 'create' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
              >
                <Plus className="w-4 h-4" />
                Create Order
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'list' ? (
          <OrderList onCreateClick={() => setView('create')} />
        ) : (
          <OrderForm onSuccess={() => setView('list')} onCancel={() => setView('list')} />
        )}
      </main>
    </div>
  );
}
