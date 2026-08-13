// File: client/src/components/orders/OrderList.jsx
// Complete order list with search, filters, and admin actions

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../services/orderService';
import { formatCurrency, formatDate, isAdmin } from '../../lib/utils';
import StatusBadge from '../ui/StatusBadge';
import LoadingSpinner from '../ui/LoadingSpinner';
import OrderDetails from './OrderDetails';
import { Search, Filter, Eye, Plus, Download } from 'lucide-react';

export default function OrderList({ onCreateClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch orders from API
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => orderService.getOrders({ 
      status: statusFilter !== 'all' ? statusFilter : undefined 
    }),
  });

  // Filter orders by search term
  const filteredOrders = orders?.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.retailerName?.toLowerCase().includes(searchLower) ||
      order.retailerEmail?.toLowerCase().includes(searchLower) ||
      order.retailerPhone?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Loading state
  if (isLoading) {
    return <LoadingSpinner text="Loading orders..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-red-600 mb-4">Error loading orders: {error.message}</p>
        <button onClick={() => refetch()} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Total Orders" 
          value={orders?.length || 0}
          color="blue"
        />
        <StatCard 
          label="Pending" 
          value={orders?.filter(o => o.status === 'pending').length || 0}
          color="yellow"
        />
        <StatCard 
          label="Completed" 
          value={orders?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0}
          color="green"
        />
        <StatCard 
          label="Total Value" 
          value={formatCurrency(orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0)}
          color="purple"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by order number, retailer name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="ready-to-ship">Ready to Ship</option>
              <option value="dispatched">Dispatched</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Create Order Button */}
          {onCreateClick && (
            <button onClick={onCreateClick} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Order
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-2">No orders found</p>
          <p className="text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first order to get started'}
          </p>
          {onCreateClick && (
            <button onClick={onCreateClick} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2 inline" />
              Create First Order
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retailer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">
                        {order.createdBy?.name || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.retailerName}</div>
                      <div className="text-sm text-gray-500">{order.retailerEmail}</div>
                      {order.retailerPhone && (
                        <div className="text-xs text-gray-400">{order.retailerPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{formatCurrency(order.amount)}</div>
                      {order.paymentStatus && (
                        <StatusBadge status={order.paymentStatus} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={order.status || order.orderStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <div key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{order.orderNumber}</div>
                    <div className="text-sm text-gray-500">{order.retailerName}</div>
                  </div>
                  <StatusBadge status={order.status || order.orderStatus} />
                </div>
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  <div>{formatDate(order.createdAt)}</div>
                  <div>{order.items?.length || 0} items • {formatCurrency(order.amount)}</div>
                </div>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="text-primary hover:text-primary-dark flex items-center gap-1 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Showing {filteredOrders.length} of {orders?.length || 0} orders
        {(searchTerm || statusFilter !== 'all') && ' (filtered)'}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            setSelectedOrder(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-transparent hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
