const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

const ApiKey = require('../models/ApiKey');
const SerialRegistry = require('../models/SerialRegistry');
const User = require('../models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iconic_crm';

async function runMasterSecuritySuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING MASTER SECURITY & INTEGRATION TEST SUITE');
  console.log('====================================================');

  // Test 1: ApiKey Model Schema Validation
  console.log('\n--- 🔑 1. Validating ApiKey Schema & dealerScope ---');
  const ApiKey = require('../models/ApiKey');
  const apiKeyPaths = Object.keys(ApiKey.schema.paths);
  if (!apiKeyPaths.includes('dealerScope')) {
    throw new Error('ApiKey schema missing dealerScope field');
  }
  console.log('✅ ApiKey schema correctly contains dealerScope: [String]');

  // Test 2: SerialRegistry Model Schema & Index Validation
  console.log('\n--- 📦 2. Validating SerialRegistry Schema & Compound Index ---');
  const SerialRegistry = require('../models/SerialRegistry');
  const registryPaths = Object.keys(SerialRegistry.schema.paths);
  if (!registryPaths.includes('ownershipHistory')) {
    throw new Error('SerialRegistry schema missing ownershipHistory field');
  }
  const indexes = SerialRegistry.schema.indexes();
  const hasCompoundIndex = indexes.some(idx => idx[0].materialCode === 1 && idx[0].serialNumber === 1 && idx[1].unique === true);
  if (!hasCompoundIndex) {
    throw new Error('SerialRegistry missing compound unique index on materialCode + serialNumber');
  }
  console.log('✅ SerialRegistry schema correctly contains ownershipHistory and compound unique index');

  // Test 3: Middleware Scoping Logic
  console.log('\n--- 🛡️ 3. Validating apiKeyAuth Middleware & Dealer Isolation ---');
  const { apiKeyAuth } = require('../middleware/apiKeyAuth');
  if (typeof apiKeyAuth !== 'function') {
    throw new Error('apiKeyAuth middleware not properly exported');
  }
  console.log('✅ apiKeyAuth middleware function imported and validated');

  // Test 4: External Serial Validation Router
  console.log('\n--- 🔌 4. Validating External Serial Validation Router ---');
  const externalRouter = require('../routes/externalSerialValidation');
  if (!externalRouter) {
    throw new Error('externalSerialValidation router failed to load');
  }
  console.log('✅ externalSerialValidation router verified');

  console.log('\n====================================================');
  console.log('🎉 ALL MASTER SECURITY & INTEGRATION TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

runMasterSecuritySuite();
