const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { authLimiter, getRateLimiter } = require('./middleware/rateLimiter');
const logger = require('./services/logger');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Initialize Socket.IO for real-time notifications
// Socket.IO CORS - support multiple origins
const socketIOOrigins = [
  process.env.FRONTEND_URL,
  'https://www.iconicsmart.co.in',
  'https://iconicsmart.co.in',
  'http://localhost:5173',
  'http://localhost:7000',
  'http://localhost:3000'
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (socketIOOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('⚠️ Socket.IO CORS blocked origin:', origin);
        // In production, block unauthorized origins
        if (process.env.NODE_ENV === 'production') {
          callback(new Error('Not allowed by Socket.IO CORS'));
        } else {
          callback(null, true); // Allow in development
        }
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);

  // Join user room if authenticated
  socket.on('authenticate', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`👤 User ${userId} joined their room`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
  });
});

// CORS Configuration for production domain
const allowedOrigins = [
  'http://localhost:7000',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://www.iconicsmart.co.in',
  'https://iconicsmart.co.in',
  'http://www.iconicsmart.co.in',
  'http://iconicsmart.co.in'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('⚠️ CORS blocked origin:', origin);
      // In production, block unauthorized origins for security
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true); // Allow in development for testing
      }
    }
  },
  credentials: true
}));

const { v4: uuidv4 } = require('uuid');
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Middleware - ENABLED with permissive settings for React/HTML compatibility
const { securityHeaders, apiSecurityHeaders, logSecurityHeaders } = require('./middleware/security');

// Apply security headers (with permissive CSP for React/HTML pages)
app.use(securityHeaders);

// Apply API-specific security headers
app.use(apiSecurityHeaders);

// Log security headers in development
if (process.env.NODE_ENV === 'development') {
  app.use(logSecurityHeaders);
}
app.set('trust proxy', 1);

// Rate Limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', getRateLimiter);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve React build if it exists
const fs = require('fs');
if (fs.existsSync(path.join(__dirname, 'client', 'dist'))) {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
}

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection with better error handling
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/iconic-crm?authSource=admin';

logger.info('🔌 Attempting MongoDB connection...');
logger.info(`URI resolved to: ${MONGO_URI.replace(/:[^:@]+@/, ':****@')}`);

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  logger.info('✅ MongoDB connected successfully!');
  logger.info('📊 Database:', mongoose.connection.name);
  try {
    const { autoSeedIfEmpty } = require('./seed');
    await autoSeedIfEmpty();
  } catch (err) {
    logger.warn('Auto-seed check failed:', err.message);
  }
})
.catch(err => {
  logger.error('❌ MongoDB connection error:', err.message);
  logger.error('💡 Make sure MongoDB is running: docker-compose up -d mongodb');
});

// Root route - redirect to login (BEFORE API routes)
app.get('/', (req, res) => {
  logger.debug('🏠 Root route accessed, redirecting to login');
  res.redirect('/login.html');
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/beat-tracker', require('./routes/beatTracker'));
app.use('/api/api-keys', require('./routes/apiKeys'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/services', require('./routes/services'));
app.use('/api/service-centers', require('./routes/serviceCenters'));
app.use('/api/service-requests', require('./routes/serviceRequests'));
app.use('/api/content-requests', require('./routes/contentRequests'));
app.use('/api/content-uploads', require('./routes/contentUploads'));
app.use('/api/content-managers', require('./routes/contentManagers'));
app.use('/api/logistic-partners', require('./routes/logisticPartners'));
app.use('/api/dispatches', require('./routes/dispatches'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/retailers', require('./routes/retailers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/config', require('./routes/config'));
app.use('/api/v1/customers', require('./routes/v1/customers'));
app.use('/api/slas', require('./routes/slas'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/serial-validation', require('./routes/serialValidation'));
app.use('/api/v1/serial-validation', require('./routes/externalSerialValidation'));

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Catch all - must be last middleware
app.use((req, res) => {
  // If it's an API route that wasn't found, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // SPA routing fallback for React client if it exists
  const distIndex = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(distIndex) && !req.path.includes('.')) {
    return res.sendFile(distIndex);
  }
  
  // If it's not a file request, redirect to login
  if (!req.path.includes('.')) {
    res.redirect('/login.html');
  } else {
    res.status(404).send('File not found');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 7000;
server.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction 
    ? `https://www.iconicsmart.co.in`
    : `http://localhost:${PORT}`;
  
  logger.info(`\n🚀 Server running on port ${PORT}`);
  logger.info(`📱 Access the CRM at: ${baseUrl}`);
  logger.info(`🔐 Login page: ${baseUrl}/login.html`);
  logger.info(`🔌 Socket.IO ready for real-time notifications`);
  if (isProduction) {
    logger.info(`🌐 Production mode: iconicsmart.co.in`);
  } else {
    logger.info(`🔧 Development mode: localhost:${PORT}\n`);
  }
});
