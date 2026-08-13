const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Start in-memory MongoDB
let mongoServer;

async function startServer() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('In-memory MongoDB connected');

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/services', require('./routes/services'));
  app.use('/api/deliveries', require('./routes/deliveries'));
  app.use('/api/marketing', require('./routes/marketing'));
  app.use('/api/leads', require('./routes/leads'));
  app.use('/api/opportunities', require('./routes/opportunities'));
  app.use('/api/contacts', require('./routes/contacts'));
  app.use('/api/invoices', require('./routes/invoices'));

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

  return app.listen(5001, () => console.log('Test server running on port 5001'));
}

async function stopServer() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

module.exports = { startServer, stopServer, app };
