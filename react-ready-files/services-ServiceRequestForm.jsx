// File: client/src/components/services/ServiceRequestForm.jsx
// Create service request form with validation

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceRequestService, serviceCenterService } from '../../services/serviceRequestService';
import { getUser } from '../../lib/utils';
import LoadingSpinner from '../ui/LoadingSpinner';
import PriorityBadge from './PriorityBadge';
import { Wrench, Package, AlertCircle, User, MapPin, Calendar } from 'lucide-react';

export default function ServiceRequestForm({ onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const user = getUser();

  const [formData, setFormData] = useState({
    serviceType: 'repair',
    productType: 'LED TV',
    serialNumber: '',
    description: '',
    priority: 'medium',
    customerName: user?.name || '',
    customerPhone: '',
    customerEmail: user?.email || '',
    address: '',
    preferredDate: '',
  });

  // Fetch service centers
  const { data: serviceCenters } = useQuery({
    queryKey: ['service-centers'],
    queryFn: serviceCenterService.getServiceCenters,
  });

  // Create service request mutation
  const createMutation = useMutation({
    mutationFn: serviceRequestService.createServiceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries(['service-requests']);
      alert('✅ Service request created successfully!');
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      alert('❌ Failed to create service request: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      alert('Please provide a description of the issue');
      return;
    }

    if (!formData.customerPhone.trim()) {
      alert('Please provide a contact phone number');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
        <div className="flex items-center gap-3 mb-2">
          <Wrench className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">New Service Request</h2>
        </div>
        <p className="text-gray-600">Fill in the details below to create a service request</p>
      </div>

      {/* Service Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Service Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="installation">Installation</option>
              <option value="repair">Repair</option>
              <option value="maintenance">Maintenance</option>
              <option value="warranty">Warranty Claim</option>
            </select>
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Type <span className="text-red-500">*</span>
            </label>
            <select
              name="productType"
              value={formData.productType}
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

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serial Number (Optional)
            </label>
            <input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="Enter product serial number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="low">Low - Can wait</option>
              <option value="medium">Medium - Normal priority</option>
              <option value="high">High - Important</option>
              <option value="urgent">Urgent - Immediate attention</option>
            </select>
            <div className="mt-2">
              <PriorityBadge priority={formData.priority} />
            </div>
          </div>

          {/* Preferred Date */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Preferred Service Date
            </label>
            <input
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Issue Description */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Issue Description
        </h3>

        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Please describe the issue in detail..."
          rows="5"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          required
        ></textarea>
        <p className="text-sm text-gray-500 mt-2">
          Be as specific as possible to help us serve you better
        </p>
      </div>

      {/* Customer Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Contact Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              placeholder="Contact number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Customer Email */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Service Address */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Service Address
        </h3>

        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter complete address where service is required"
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          required
        ></textarea>
      </div>

      {/* Available Service Centers Info */}
      {serviceCenters && serviceCenters.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Available Service Centers</h4>
          <p className="text-sm text-blue-700 mb-3">
            We will assign the nearest service center to your request
          </p>
          <div className="text-xs text-blue-600">
            {serviceCenters.slice(0, 3).map((center, idx) => (
              <div key={center._id}>
                • {center.name} - {center.city}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary flex-1"
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <Wrench className="w-5 h-5" />
                Create Service Request
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
