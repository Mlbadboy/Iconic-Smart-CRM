// File: client/src/lib/utils.js
// Utility functions

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes intelligently
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency in Indian Rupees
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Format date
export function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(new Date(date));
}

// Format date and time
export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Get user from localStorage
export function getUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
}

// Get token from localStorage
export function getToken() {
  return localStorage.getItem('token');
}

// Check if user is admin
export function isAdmin() {
  const user = getUser();
  return user?.role === 'admin';
}

// Check if user is logged in
export function isAuthenticated() {
  return !!getToken();
}

// Logout user
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// Show toast notification (simple implementation)
export function showToast(message, type = 'info') {
  // You can integrate with a toast library like react-hot-toast
  alert(message);
}

// Truncate text
export function truncate(str, length = 50) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Calculate GST
export function calculateGST(amount, rate = 18) {
  return (amount * rate) / 100;
}

// Calculate total with GST
export function calculateTotalWithGST(subtotal, gstRate = 18) {
  const gst = calculateGST(subtotal, gstRate);
  return {
    subtotal,
    gstAmount: gst,
    gstRate,
    total: subtotal + gst,
  };
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format phone number
export function formatPhone(phone) {
  if (!phone) return '';
  // Format: +91 98765 43210
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

// Get initials from name
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate random color for avatars
export function getAvatarColor(name) {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  const index = name?.charCodeAt(0) % colors.length || 0;
  return colors[index];
}
