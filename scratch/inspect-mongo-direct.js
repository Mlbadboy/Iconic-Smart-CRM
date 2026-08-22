const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iconic-crm';

async function checkDirect() {
  const SerialRegistry = require('./models/SerialRegistry');
  const ApiKey = require('./models/ApiKey');
  const Company = require('./models/Company');

  console.log('🔍 Checking MongoDB directly...');
  // Check active server port 7000 by requesting health or checking SerialValidation
  const axios = require('axios');
  const health = await axios.get('http://localhost:7000/api/health');
  console.log('  Server health:', health.data);
}

checkDirect().catch(console.error);
