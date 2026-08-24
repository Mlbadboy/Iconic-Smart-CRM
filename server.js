const express = require('express');
console.log('🚀 Charlie Smart CRM server starting up...');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { authLimiter, getRateLimiter } = require('./middleware/rateLimiter');
const logger = require('./services/logger');

// Do not overwrite explicitly provided runtime environment variables (e.g. In-memory Mongo in tests)
dotenv.config({ override: false });

const app = express();
app.set('trust proxy', 1);

// Instant Health check routes for Railway, Docker & Cloud probes (BEFORE rate limiters & security middleware)
app.get(['/api/health', '/health', '/ping'], (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  });
});

const server = http.createServer(app);

// Initialize Socket.IO for real-time notifications
// Socket.IO CORS - support multiple origins
const socketIOOrigins = [
  process.env.FRONTEND_URL,
  'https://www.charlieai.in',
  'https://charlieai.in',
  'https://www.charlieai.com',
  'https://charlieai.com',
  'http://localhost:5173',
  'http://localhost:7000',
  'http://localhost:3000'
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: true,
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

// CORS Configuration - Permissive reflection with credentials for all custom domains & subdomains
app.use(cors({
  origin: true,
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

// Root route - redirect to login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection with resilient local in-memory fallback
async function initializeDatabase() {
  const configuredUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

  if (configuredUri && !configuredUri.includes('localhost:27017') && !configuredUri.includes('127.0.0.1:27017')) {
    try {
      logger.info('🔌 Connecting to configured production MongoDB...');
      await mongoose.connect(configuredUri, { serverSelectionTimeoutMS: 10000 });
      logger.info('✅ MongoDB connected successfully!');
      return true;
    } catch (err) {
      logger.error('❌ Configured MongoDB connection failed:', err.message);
      if (isProduction) return false;
    }
  }

  if (isProduction) {
    logger.warn('⚠️ In production mode without local fallback.');
    return false;
  }

  // Attempt local MongoDB daemon
  try {
    const localUri = configuredUri || 'mongodb://127.0.0.1:27017/charlies-crm';
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 1000 });
    logger.info('✅ Connected to local MongoDB daemon!');
    return true;
  } catch (err) {
    logger.info('ℹ️ Local MongoDB daemon not found, launching in-memory database for testing...');
  }

  // Fallback to MongoMemoryServer (DEVELOPMENT / TEST ONLY)
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    global.__mongoMemoryServer__ = mongod;
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    logger.info('✅ In-Memory MongoDB initialized and connected successfully!');
    return true;
  } catch (err) {
    logger.error('❌ Failed to initialize in-memory database:', err.message);
    return false;
  }
}

initializeDatabase().then(async (connected) => {
  if (!connected) return;
  logger.info('📊 Database:', mongoose.connection.name);
  try {
    const { autoSeedIfEmpty } = require('./seed');
    await autoSeedIfEmpty();
  } catch (err) {
    logger.warn('Auto-seed check notice:', err.message);
  }
  try {
    const { migrateToMultiTenant } = require('./scripts/migrate-to-multitenant');
    await migrateToMultiTenant();
  } catch (err) {
    logger.warn('Multi-tenant migration notice:', err.message);
  }
  try {
    startQueueWorker(2000);
    logger.info('📱 WhatsApp campaign queue worker started.');
  } catch (err) {
    logger.warn('WhatsApp queue worker notice:', err.message);
  }
  try {
    const { startMarketingScheduler } = require('./services/marketingSchedulerService');
    const { seedDefaultHolidays } = require('./services/holidayEngineService');
    startMarketingScheduler(15000);
    seedDefaultHolidays();
    logger.info('📱 Social marketing scheduler and Holiday Master initialized.');
  } catch (err) {
    logger.warn('Social marketing scheduler notice:', err.message);
  }
}).catch(err => {
  logger.error('Database initialization error:', err.message);
});



// API Routes
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/stock-transfers', require('./routes/stockTransfers'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/tenant-control', require('./routes/tenantControl'));
app.use('/api/notifications', require('./routes/platformNotifications'));
app.use('/api/platform/analytics', require('./routes/platformAnalytics'));
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
app.use('/api/v1/serial-registry', require('./routes/serialRegistry'));
app.use('/qerp/validatesno.asp', (req, res, next) => { req.url = '/validate'; require('./routes/externalSerialValidation')(req, res, next); });
app.use('/api/bulk-import', require('./middleware/featureGate').requireFeature('bulk_import'), require('./routes/bulkImport'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/social-marketing', require('./routes/socialMarketing'));
app.use('/api/super-admin/whatsapp', require('./routes/superAdminWhatsApp'));
app.use('/api/super-admin/marketing', require('./routes/superAdminMarketing'));

// Start WhatsApp background campaign queue worker
const { setSocketIO, startQueueWorker } = require('./services/whatsAppQueueService');
setSocketIO(io);

// Catch all - must be last middleware
app.use((req, res) => {
  // If it's an API route that wasn't found, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // If it's not a static file request, redirect to login
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
server.listen(PORT, '0.0.0.0', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  logger.info(`\n🚀 Charlie Smart CRM server running on port ${PORT} (0.0.0.0)`);
  logger.info(`📱 Healthcheck active at /api/health`);
  if (isProduction) {
    logger.info(`🌐 Production mode active`);
  } else {
    logger.info(`🔧 Development mode: http://localhost:${PORT}`);
  }
});
