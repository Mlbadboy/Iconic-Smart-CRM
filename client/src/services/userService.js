// File: client/src/services/userService.js
// User management API service (Admin only)

import api from '../lib/api';

export const userService = {
  // Get all users (admin)
  async getUsers(params = {}) {
    const response = await api.get('/users', { params });
    return response.data;
  },
  
  // Get single user
  async getUser(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  // Create user (admin)
  async createUser(data) {
    const response = await api.post('/users', data);
    return response.data;
  },
  
  // Update user (admin)
  async updateUser(id, data) {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  
  // Delete user (admin)
  async deleteUser(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  
  // Toggle user active status (admin)
  async toggleUserStatus(id) {
    const response = await api.put(`/users/${id}/toggle-status`);
    return response.data;
  },
};
