// File: client/src/services/productService.js
// Product API service

import api from '../lib/api';

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
  
  // Create product (admin)
  async createProduct(data) {
    const response = await api.post('/products', data);
    return response.data;
  },
  
  // Update product (admin)
  async updateProduct(id, data) {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  
  // Delete product (admin)
  async deleteProduct(id) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
  
  // Fetch products from website (admin, scraping)
  async fetchFromWebsite() {
    const response = await api.get('/products/fetch-from-website');
    return response.data;
  },
};
