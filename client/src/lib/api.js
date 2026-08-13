// File: client/src/lib/api.js
// Axios instance with interceptors

import axios from 'axios';
import { getToken, logout } from './utils';

// API base URL - uses environment variable or defaults to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';

console.log('🔌 API URL:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    // Log error details
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - Logging out');
      logout();
      return Promise.reject(error);
    }
    
    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      const retryAfter = error.response.data?.retryAfter || '15 minutes';
      alert(`⚠️ Rate limit exceeded! Please wait ${retryAfter}`);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      alert('🚫 Access denied. You don\'t have permission for this action.');
    }

    // Handle network errors
    if (error.message === 'Network Error') {
      alert('🌐 Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

export default api;
