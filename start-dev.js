const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');

async function start() {
  console.log('🏁 Starting In-Memory MongoDB Server...');
  const mongoServer = await MongoMemoryServer.create();
  global.mongoServerInstance = mongoServer; // Prevent garbage collection
  const mongoUri = mongoServer.getUri();
  console.log(`✅ In-Memory MongoDB running at: ${mongoUri}`);

  process.env.MONGO_URI = mongoUri;
  process.env.PORT = '7000';
  process.env.NODE_ENV = 'development';

  console.log('🌱 Seeding database in-process...');
  const seedDatabase = require('./seed');
  await seedDatabase();

  console.log('🚀 Starting Express CRM Server on port 7000...');
  require('./server.js');
}

start().catch(err => {
  console.error('❌ Failed to start dev environment:', err);
});
