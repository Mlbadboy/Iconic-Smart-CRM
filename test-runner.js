const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');

async function runCommand(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🏃 Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command ${command} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('🏁 Starting Deterministic Test Environment...');
  let mongoServer;

  try {
    // 1. Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    console.log(`✅ In-Memory MongoDB ready: ${mongoUri}`);

    // Set Environment Variables
    process.env.MONGO_URI = mongoUri;
    process.env.NODE_ENV = 'test';
    process.env.PORT = '7001';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt';
    process.env.TEST_URL = 'http://localhost:7001';

    // 2. Seed Database
    console.log('🌱 Seeding database...');
    await runCommand('node', ['seed.js'], { MONGO_URI: mongoUri });

    // 3. Start Express Server In-Process
    console.log('🚀 Starting Express Server...');
    require('./server.js');

    // Wait 3 seconds for server to initialize and connect to DB
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('✅ Express Server is ready! Running tests...');

    // 4. Run Audit Regression Tests
    console.log('🧪 Running audit regression tests...');
    await runCommand('node', ['test-crm-audit-regression.js'], process.env);

    // 5. Run Features E2E Tests
    console.log('🧪 Running comprehensive feature tests...');
    await runCommand('node', ['test-all-features.js'], process.env);

    console.log('🎉 All test suites passed successfully!');
    
    // Clean up
    await mongoose.connection.close();
    await mongoServer.stop();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test environment execution failed:', error.message);
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(1);
  }
}

main();
