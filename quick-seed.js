const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/iconic-crm?authSource=admin';

console.log('🔌 Connecting to MongoDB...');
console.log('URI:', MONGO_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(async () => {
  console.log('✅ MongoDB connected successfully!\n');
  
  // Define User Schema
  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['admin', 'manager', 'sales', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
  });
  
  const User = mongoose.models.User || mongoose.model('User', userSchema);
  
  console.log('👥 Creating demo users...\n');
  
  // Demo users
  const demoUsers = [
    { name: 'Admin User', email: 'admin@charlieai.com', password: 'admin123', role: 'admin' },
    { name: 'Manager User', email: 'manager@charlieai.com', password: 'manager123', role: 'manager' },
    { name: 'Sales User', email: 'sales@charlieai.com', password: 'sales123', role: 'sales' }
  ];
  
  for (const userData of demoUsers) {
    try {
      // Check if user exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists - skipping`);
      } else {
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user
        await User.create({
          ...userData,
          password: hashedPassword
        });
        
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }
  
  // Count total users
  const userCount = await User.countDocuments();
  console.log(`\n📊 Total users in database: ${userCount}`);
  
  console.log('\n✅ Database seeding complete!');
  console.log('\n🎉 You can now login with:');
  console.log('   Email: admin@charlieai.com');
  console.log('   Password: admin123\n');
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('\n💡 Make sure MongoDB is running:');
  console.error('   docker-compose up -d mongodb\n');
  process.exit(1);
});
