// File: client/src/components/orders/OrderDetails.jsx
// Order details modal with admin status update

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, invoiceService } from '../../services/orderService';
import { formatCurrency, formatDate, formatDateTime, isAdmin } from '../../lib/utils';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import { Package, User, MapPin, CreditCard, FileText, Calendar, Download, RefreshCw } from 'lucide-react';

export default function OrderDetails({ order, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState(order.status || order.orderStatus || 'pending');
  const queryClient = useQueryClient();

  // Mutation for updating order status (admin only)
  const updateStatusMutation = useMutation({
    mutationFn: (status) => orderService.updateOrderStatus(order._id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      alert('✅ Order status updated successfully!');
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      alert('❌ Failed to update status: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation for generating invoice
  const generateInvoiceMutation = useMutation({
    mutationFn: () => invoiceService.generateInvoice(order._id),
    onSuccess: (data) => {
      alert('✅ Invoice generated successfully!');
      if (data.invoicePath) {
        window.open(`http://localhost:7000${data.invoicePath}`, '_blank');
      }
    },
    onError: (error) => {
      alert('❌ Failed to generate invoice: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleStatusUpdate = () => {
    if (newStatus === (order.status || order.orderStatus)) {
      alert('⚠️ Status is already set to ' + newStatus);
      return;
    }
    
    if (window.confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
      updateStatusMutation.mutate(newStatus);
    }
  };

  const handleGenerateInvoice = () => {
    if (window.confirm('Generate PDF invoice for this order?')) {
      generateInvoiceMutation.mutate();
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={`Order ${order.orderNumber}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <InfoCard
            icon={<FileText className="w-5 h-5" />}
            label="Order Number"
            value={order.orderNumber}
          />
          <InfoCard
            icon={<Package className="w-5 h-5" />}
            label="Status"
            value={<StatusBadge status={order.status || order.orderStatus} />}
          />
          <InfoCard
            icon={<Calendar className="w-5 h-5" />}
            label="Order Date"
            value={formatDate(order.createdAt)}
          />
          <InfoCard
            label="Total Amount"
            value={<span className="text-lg font-bold text-primary">{formatCurrency(order.amount)}</span>}
          />
        </div>

        {/* Retailer Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Retailer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Retailer Name</p>
              <p className="font-medium text-gray-900">{order.retailerName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="font-medium text-gray-900">{order.retailerEmail || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <p className="font-medium text-gray-900">{order.retailerPhone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">GST Number</p>
              <p className="font-medium text-gray-900">{order.retailerGST || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Order Items ({order.items?.length || 0})
          </h3>
          <div className="space-y-2">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name || item.productName}</p>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>SKU: {item.sku}</span>
                      <span>Qty: {item.quantity}</span>
                      <span>Price: {formatCurrency(item.price)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(item.total || item.quantity * item.price)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No items in this order</p>
            )}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Pricing Details
          </h3>
          <div className="space-y-2 max-w-md ml-auto bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>GST ({order.gstRate || 18}%):</span>
              <span className="font-medium">{formatCurrency(order.gstAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>Total Amount:</span>
              <span className="text-primary">{formatCurrency(order.amount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {(order.paymentStatus || order.paymentMethod) && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment Information
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
              {order.paymentStatus && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Payment Status</p>
                  <StatusBadge status={order.paymentStatus} />
                </div>
              )}
              {order.paymentMethod && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-medium text-gray-900">{order.paymentMethod}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Addresses */}
        {(order.billingAddress || order.shippingAddress) && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Addresses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.billingAddress && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-2">Billing Address</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {typeof order.billingAddress === 'string' 
                      ? order.billingAddress 
                      : JSON.stringify(order.billingAddress, null, 2)}
                  </p>
                </div>
              )}
              {order.shippingAddress && (
                <div className="p-4 bg-cyan-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-2">Shipping Address</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {typeof order.shippingAddress === 'string' 
                      ? order.shippingAddress 
                      : JSON.stringify(order.shippingAddress, null, 2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Metadata */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Order Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Created:</span>
              <span className="font-medium">{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Last Updated:</span>
              <span className="font-medium">{formatDateTime(order.updatedAt)}</span>
            </div>
            {order.createdBy && (
              <div className="flex justify-between text-gray-600">
                <span>Created By:</span>
                <span className="font-medium">{order.createdBy.name || order.createdBy.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin() && (
          <div className="border-t pt-6 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-primary">🛡️ Admin Actions</h3>
            
            <div className="space-y-4">
              {/* Status Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Order Status
                </label>
                <div className="flex gap-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={updateStatusMutation.isPending}
                  >
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
                  <button
                    onClick={handleStatusUpdate}
                    disabled={updateStatusMutation.isPending}
                    className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Update Status
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generate Invoice */}
              <div>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={generateInvoiceMutation.isPending}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {generateInvoiceMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Invoice...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate & Download Invoice (PDF)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="border-t pt-6">
          <button 
            onClick={onClose} 
            className="btn btn-secondary w-full"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Helper component for info cards
function InfoCard({ icon, label, value }) {
  return (
    <div>
      {icon && <div className="text-primary mb-2">{icon}</div>}
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}
