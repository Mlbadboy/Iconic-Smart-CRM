const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/iconic-crm?authSource=admin';

console.log('🧪 Testing MongoDB Connection...\n');
console.log('URI:', MONGO_URI.replace(/:[^:@]+@/, ':****@'));
console.log('');

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  console.log('✅ MongoDB connection successful!\n');
  console.log('📊 Database:', mongoose.connection.name);
  console.log('🏠 Host:', mongoose.connection.host);
  console.log('🔌 Port:', mongoose.connection.port);
  console.log('');
  
  // List collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('📁 Collections:', collections.map(c => c.name).join(', ') || 'None');
  console.log('');
  
  // Count users
  const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String
  }));
  
  const userCount = await User.countDocuments();
  console.log('👥 Users in database:', userCount);
  
  if (userCount > 0) {
    const users = await User.find({}, 'name email role').limit(5);
    console.log('\n📋 Sample users:');
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
  }
  
  console.log('\n✅ Connection test passed! Your database is ready.');
  console.log('🚀 You can now start the server with: npm start\n');
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB connection failed!\n');
  console.error('Error:', err.message);
  console.error('');
  console.error('💡 Troubleshooting steps:');
  console.error('   1. Check if Docker Desktop is running');
  console.error('   2. Start MongoDB: docker-compose up -d mongodb');
  console.error('   3. Wait 10 seconds for MongoDB to initialize');
  console.error('   4. Check MongoDB status: docker ps | findstr mongodb');
  console.error('   5. View MongoDB logs: docker logs iconic-crm-mongodb');
  console.error('');
  process.exit(1);
});
