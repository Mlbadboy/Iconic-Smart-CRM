// Script to create dummy sales employee for testing Beat Tracker
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/iconic-crm?authSource=admin';

async function createDummyEmployee() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check if employee already exists
        const existingEmployee = await User.findOne({ email: 'shubham@charlieai.com' });
        
        if (existingEmployee) {
            console.log('⚠️  Employee "Shubham Kumar" already exists!');
            console.log('📧 Email:', existingEmployee.email);
            console.log('🔐 Password: shubham123');
            console.log('👤 Role:', existingEmployee.role);
            await mongoose.connection.close();
            return;
        }

        // Create dummy sales employee
        const hashedPassword = await bcrypt.hash('shubham123', 10);
        
        const dummyEmployee = new User({
            name: 'Shubham Kumar',
            email: 'shubham@charlieai.com',
            password: hashedPassword,
            phone: '9876543210',
            role: 'sales',
            department: 'Sales',
            isActive: true,
            createdAt: new Date()
        });

        await dummyEmployee.save();

        console.log('✅ Dummy Sales Employee Created Successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 Name: Shubham Kumar');
        console.log('📧 Email: shubham@charlieai.com');
        console.log('🔐 Password: shubham123');
        console.log('📱 Phone: 9876543210');
        console.log('👔 Role: Sales');
        console.log('🏢 Department: Sales');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎯 Use these credentials to:');
        console.log('   1. Login to CRM');
        console.log('   2. Test Beat Tracker');
        console.log('   3. Track attendance & visits\n');
        console.log('📍 Access Beat Tracker at: http://localhost:7000/beat-tracker.html\n');

        await mongoose.connection.close();
        console.log('✅ Script completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

createDummyEmployee();
