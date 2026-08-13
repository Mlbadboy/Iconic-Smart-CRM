// Script to verify sales employee is visible in Beat Tracker
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/iconic-crm?authSource=admin';

async function verifyBeatTracker() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Query that Beat Tracker uses
        const fieldEmployees = await User.find({ 
            role: { $in: ['sales', 'field-executive', 'sales-executive'] },
            isActive: true
        }).select('name email phone role department');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 BEAT TRACKER - Field Employees');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (fieldEmployees.length === 0) {
            console.log('❌ NO FIELD EMPLOYEES FOUND!');
            console.log('   Beat Tracker will be empty.\n');
            console.log('💡 To add employees:');
            console.log('   1. Run: node seedDummyEmployee.js');
            console.log('   2. Or use Quick Add in Manage Users\n');
        } else {
            console.log(`✅ Found ${fieldEmployees.length} field employee(s):\n`);
            
            fieldEmployees.forEach((emp, index) => {
                console.log(`${index + 1}. ${emp.name}`);
                console.log(`   📧 Email: ${emp.email}`);
                console.log(`   📱 Phone: ${emp.phone || 'N/A'}`);
                console.log(`   👔 Role: ${emp.role}`);
                console.log(`   🏢 Department: ${emp.department || 'N/A'}`);
                console.log(`   🆔 ID: ${emp._id}`);
                console.log('');
            });

            console.log('✅ These employees are visible in Beat Tracker!');
            console.log('   Access: http://localhost:7000/beat-tracker.html\n');
        }

        // Also check all users
        const allUsers = await User.find().select('name email role isActive');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Total Users in System: ${allUsers.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const roleCount = {};
        allUsers.forEach(user => {
            roleCount[user.role] = (roleCount[user.role] || 0) + 1;
        });

        console.log('Users by Role:');
        Object.keys(roleCount).forEach(role => {
            console.log(`   ${role}: ${roleCount[role]}`);
        });

        console.log('\n✅ Verification complete!');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

verifyBeatTracker();
