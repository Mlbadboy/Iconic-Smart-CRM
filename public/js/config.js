// Configuration for Iconic Smart CRM
// Automatically detects localhost vs production

const CONFIG = {
    // Detect if we're on localhost or production
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Get the base API URL
    getApiUrl: function() {
        if (this.isDevelopment) {
            // Development - use localhost
            return 'http://localhost:7000/api';
        } else {
            // Production - use iconicsmart.co.in
            return `${window.location.protocol}//${window.location.host}/api`;
        }
    },
    
    // Get the base URL
    getBaseUrl: function() {
        if (this.isDevelopment) {
            return 'http://localhost:7000';
        } else {
            return `${window.location.protocol}//${window.location.host}`;
        }
    },
    
    // Domain info
    domain: {
        development: 'localhost:7000',
        production: 'www.iconicsmart.co.in'
    },
    
    // App info
    app: {
        name: 'Iconic Smart CRM',
        version: '1.0.0',
        company: 'Iconic Smart'
    }
};

// Export for use in other files
window.CRM_CONFIG = CONFIG;

// Also set API_URL globally for backward compatibility
window.API_URL = CONFIG.getApiUrl();

console.log('🌐 CRM Config Loaded');
console.log('Environment:', CONFIG.isDevelopment ? 'Development' : 'Production');
console.log('API URL:', CONFIG.getApiUrl());
console.log('Base URL:', CONFIG.getBaseUrl());
