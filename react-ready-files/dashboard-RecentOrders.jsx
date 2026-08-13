// File: client/src/components/dashboard/RecentOrders.jsx
// Recent orders table

import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../lib/utils';
import StatusBadge from '../ui/StatusBadge';
import { Eye, ArrowRight } from 'lucide-react';

export default function RecentOrders({ orders, loading }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          <p className="text-sm text-gray-600">Latest 10 orders</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="text-primary hover:text-primary-dark flex items-center gap-1 text-sm font-medium"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {orders && orders.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Order</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Retailer</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{order.orderNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-700">{order.retailerName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{formatCurrency(order.amount)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status || order.orderStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate('/orders')}
                        className="text-primary hover:text-primary-dark"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.retailerName}</p>
                  </div>
                  <StatusBadge status={order.status || order.orderStatus} />
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(order.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => navigate('/orders')}
                    className="btn btn-secondary btn-sm"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <Package className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-500">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first order to get started</p>
          <button
            onClick={() => navigate('/orders')}
            className="btn btn-primary mt-4"
          >
            Create Order
          </button>
        </div>
      )}
    </div>
  );
}
