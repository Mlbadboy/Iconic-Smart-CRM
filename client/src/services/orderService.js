// File: client/src/services/orderService.js
// Complete order service with API calls

import api from '../lib/api';

export const orderService = {
  // Get all orders (with optional filters)
  async getOrders(params = {}) {
    const response = await api.get('/orders', { params });
    return response.data;
  },
  
  // Get single order
  async getOrder(id) {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  
  // Create new order
  async createOrder(orderData) {
    const response = await api.post('/orders', orderData);
    return response.data;
  },
  
  // Update order status (admin only)
  async updateOrderStatus(id, status) {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },

  // Get order statistics
  async getOrderStats() {
    const response = await api.get('/orders/stats');
    return response.data;
  },
};

export const retailerService = {
  // Get all retailers
  async getRetailers() {
    const response = await api.get('/retailers');
    return response.data;
  },
  
  // Get single retailer
  async getRetailer(id) {
    const response = await api.get(`/retailers/${id}`);
    return response.data;
  },

  // Create retailer
  async createRetailer(data) {
    const response = await api.post('/retailers', data);
    return response.data;
  },
};

export const productService = {
  // Get all products
  async getProducts(params = {}) {
    const response = await api.get('/products', { params });
    return response.data;
  },
  
  // Get single product
  async getProduct(id) {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Fetch products from website
  async fetchFromWebsite() {
    const response = await api.get('/products/fetch-from-website');
    return response.data;
  },
};

export const invoiceService = {
  // Generate invoice for order
  async generateInvoice(orderId) {
    const response = await api.post(`/invoices/generate/${orderId}`);
    return response.data;
  },
};
