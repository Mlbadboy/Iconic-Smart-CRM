// File: client/src/services/serviceRequestService.js
// Service request API calls

import api from '../lib/api';

export const serviceRequestService = {
  // Get all service requests
  async getServiceRequests(params = {}) {
    const response = await api.get('/service-requests', { params });
    return response.data;
  },
  
  // Get single service request
  async getServiceRequest(id) {
    const response = await api.get(`/service-requests/${id}`);
    return response.data;
  },
  
  // Create new service request
  async createServiceRequest(data) {
    const response = await api.post('/service-requests', data);
    return response.data;
  },
  
  // Update service request (admin)
  async updateServiceRequest(id, data) {
    const response = await api.put(`/service-requests/${id}`, data);
    return response.data;
  },
  
  // Update status (admin)
  async updateStatus(id, status) {
    const response = await api.put(`/service-requests/${id}/status`, { status });
    return response.data;
  },
  
  // Delete service request (admin)
  async deleteServiceRequest(id) {
    const response = await api.delete(`/service-requests/${id}`);
    return response.data;
  },
};

export const serviceCenterService = {
  // Get all service centers
  async getServiceCenters() {
    const response = await api.get('/service-centers');
    return response.data;
  },
  
  // Get single service center
  async getServiceCenter(id) {
    const response = await api.get(`/service-centers/${id}`);
    return response.data;
  },
};
