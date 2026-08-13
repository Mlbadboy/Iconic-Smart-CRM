// File: client/src/components/services/ServiceRequestList.jsx
// Service requests list with search, filters, and admin features

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { serviceRequestService } from '../../services/serviceRequestService';
import { formatDate, isAdmin } from '../../lib/utils';
import StatusBadge from '../ui/StatusBadge';
import PriorityBadge from './PriorityBadge';
import LoadingSpinner from '../ui/LoadingSpinner';
import ServiceRequestDetails from './ServiceRequestDetails';
import { Search, Filter, Eye, Plus, Wrench } from 'lucide-react';

export default function ServiceRequestList({ onCreateClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Fetch service requests
  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ['service-requests', statusFilter, priorityFilter],
    queryFn: () => serviceRequestService.getServiceRequests({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    }),
  });

  // Filter by search term
  const filteredRequests = requests?.filter(req => {
    const searchLower = searchTerm.toLowerCase();
    return (
      req.serviceId?.toLowerCase().includes(searchLower) ||
      req.customerName?.toLowerCase().includes(searchLower) ||
      req.customerPhone?.toLowerCase().includes(searchLower) ||
      req.productType?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (isLoading) {
    return <LoadingSpinner text="Loading service requests..." />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-red-600 mb-4">Error loading service requests: {error.message}</p>
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
        <StatCard label="Total Requests" value={requests?.length || 0} color="blue" />
        <StatCard 
          label="Open" 
          value={requests?.filter(r => r.status === 'open').length || 0} 
          color="yellow" 
        />
        <StatCard 
          label="In Progress" 
          value={requests?.filter(r => r.status === 'in-progress').length || 0} 
          color="purple" 
        />
        <StatCard 
          label="Resolved" 
          value={requests?.filter(r => r.status === 'resolved' || r.status === 'closed').length || 0} 
          color="green" 
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
                placeholder="Search by ID, customer, phone, product..."
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
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Create Button */}
          {onCreateClick && (
            <button onClick={onCreateClick} className="btn btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              New Request
            </button>
          )}
        </div>
      </div>

      {/* Service Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Wrench className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-500 text-lg mb-2">No service requests found</p>
          <p className="text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first service request'}
          </p>
          {onCreateClick && (
            <button onClick={onCreateClick} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2 inline" />
              Create Service Request
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{request.serviceId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{request.customerName || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{request.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 capitalize">{request.serviceType}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{request.productType}</div>
                      {request.serialNumber && (
                        <div className="text-xs text-gray-500">SN: {request.serialNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityBadge priority={request.priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRequest(request)}
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
          <div className="md:hidden divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{request.serviceId}</p>
                    <p className="text-sm text-gray-600">{request.customerName}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <PriorityBadge priority={request.priority} />
                    <StatusBadge status={request.status} />
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  <div><span className="font-medium">Type:</span> {request.serviceType}</div>
                  <div><span className="font-medium">Product:</span> {request.productType}</div>
                  <div><span className="font-medium">Date:</span> {formatDate(request.createdAt)}</div>
                </div>
                <button
                  onClick={() => setSelectedRequest(request)}
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
        Showing {filteredRequests.length} of {requests?.length || 0} service requests
      </div>

      {/* Service Request Details Modal */}
      {selectedRequest && (
        <ServiceRequestDetails
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={() => {
            setSelectedRequest(null);
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
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    green: 'bg-green-100 text-green-600 border-green-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4">
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
