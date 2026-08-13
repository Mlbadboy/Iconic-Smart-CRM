// Quick MongoDB Atlas Setup Helper
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🌐 MongoDB Atlas Quick Setup\n');
console.log('Follow these steps:');
console.log('1. Go to: https://www.mongodb.com/cloud/atlas/register');
console.log('2. Sign up for FREE account');
console.log('3. Create a FREE cluster (M0)');
console.log('4. Click "Connect" → "Connect your application"');
console.log('5. Copy the connection string\n');

rl.question('Paste your MongoDB Atlas connection string here: ', (mongoUri) => {
  if (!mongoUri || !mongoUri.includes('mongodb')) {
    console.log('\n❌ Invalid connection string. Please try again.');
    rl.close();
    return;
  }

  // Update .env file
  const envContent = `# MongoDB Atlas Cloud Database
MONGO_URI=${mongoUri}

# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=${generateRandomString(64)}
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000
`;

  fs.writeFileSync('.env', envContent);
  
  console.log('\n✅ Configuration updated!');
  console.log('\nNext steps:');
  console.log('1. npm run seed    # Populate demo data');
  console.log('2. npm start       # Start the server');
  console.log('3. Login with: admin@iconic-crm.com / admin123\n');
  
  rl.close();
});

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
