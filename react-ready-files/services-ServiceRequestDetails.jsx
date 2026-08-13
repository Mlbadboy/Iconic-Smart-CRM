// File: client/src/components/services/ServiceRequestDetails.jsx
// Service request details modal with admin update features

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceRequestService, serviceCenterService } from '../../services/serviceRequestService';
import { formatDate, formatDateTime, isAdmin } from '../../lib/utils';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import PriorityBadge from './PriorityBadge';
import { Package, User, MapPin, Calendar, Wrench, RefreshCw, FileText } from 'lucide-react';

export default function ServiceRequestDetails({ request, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState(request.status);
  const [selectedCenter, setSelectedCenter] = useState(request.serviceCenterId || '');
  const queryClient = useQueryClient();
  const admin = isAdmin();

  // Fetch service centers (for admin assignment)
  const { data: serviceCenters } = useQuery({
    queryKey: ['service-centers'],
    queryFn: serviceCenterService.getServiceCenters,
    enabled: admin,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status) => serviceRequestService.updateStatus(request._id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['service-requests']);
      alert('✅ Service request updated successfully!');
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      alert('❌ Failed to update: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleStatusUpdate = () => {
    if (newStatus === request.status) {
      alert('⚠️ Status is already set to ' + newStatus);
      return;
    }
    
    if (window.confirm(`Change status to "${newStatus}"?`)) {
      updateStatusMutation.mutate(newStatus);
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={`Service Request ${request.serviceId}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Request Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <InfoCard
            icon={<FileText className="w-5 h-5" />}
            label="Request ID"
            value={request.serviceId}
          />
          <InfoCard
            icon={<Package className="w-5 h-5" />}
            label="Status"
            value={<StatusBadge status={request.status} />}
          />
          <InfoCard
            label="Priority"
            value={<PriorityBadge priority={request.priority} />}
          />
          <InfoCard
            icon={<Calendar className="w-5 h-5" />}
            label="Created"
            value={formatDate(request.createdAt)}
          />
        </div>

        {/* Service Details */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Service Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Service Type</p>
              <p className="font-medium text-gray-900 capitalize">{request.serviceType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Product Type</p>
              <p className="font-medium text-gray-900">{request.productType}</p>
            </div>
            {request.serialNumber && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-1">Serial Number</p>
                <p className="font-medium text-gray-900">{request.serialNumber}</p>
              </div>
            )}
            {request.preferredDate && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-1">Preferred Service Date</p>
                <p className="font-medium text-gray-900">{formatDate(request.preferredDate)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Issue Description */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Issue Description</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
          </div>
        </div>

        {/* Customer Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Customer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Name</p>
              <p className="font-medium text-gray-900">{request.customerName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <p className="font-medium text-gray-900">{request.customerPhone || 'N/A'}</p>
            </div>
            {request.customerEmail && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="font-medium text-gray-900">{request.customerEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Service Address */}
        {request.address && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Service Address
            </h3>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{request.address}</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Request Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Created:</span>
              <span className="font-medium">{formatDateTime(request.createdAt)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Last Updated:</span>
              <span className="font-medium">{formatDateTime(request.updatedAt)}</span>
            </div>
            {request.createdBy && (
              <div className="flex justify-between text-gray-600">
                <span>Created By:</span>
                <span className="font-medium">{request.createdBy.name || request.createdBy.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Admin Actions */}
        {admin && (
          <div className="border-t pt-6 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-primary">🛡️ Admin Actions</h3>
            
            <div className="space-y-4">
              {/* Status Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Status
                </label>
                <div className="flex gap-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    disabled={updateStatusMutation.isPending}
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
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
                        Update
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Service Center Assignment */}
              {serviceCenters && serviceCenters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Service Center
                  </label>
                  <select
                    value={selectedCenter}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select service center...</option>
                    {serviceCenters.map((center) => (
                      <option key={center._id} value={center._id}>
                        {center.name} - {center.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="border-t pt-6">
          <button onClick={onClose} className="btn btn-secondary w-full">
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