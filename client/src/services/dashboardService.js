// File: client/src/services/dashboardService.js
// Dashboard API service

import api from '../lib/api';

export const dashboardService = {
  // Get dashboard statistics
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  // Get sales data for charts
  async getSalesData(days = 7) {
    const response = await api.get('/dashboard/sales', {
      params: { days }
    });
    return response.data;
  },

  // Get order status distribution
  async getStatusDistribution() {
    const response = await api.get('/dashboard/status-distribution');
    return response.data;
  },

  // Get recent activity
  async getRecentActivity(limit = 10) {
    const response = await api.get('/dashboard/recent-activity', {
      params: { limit }
    });
    return response.data;
  },
};
