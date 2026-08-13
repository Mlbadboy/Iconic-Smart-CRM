// Quick script to check if orders exist in database
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');

async function checkOrders() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Count orders
        const count = await Order.countDocuments();
        console.log(`📊 Total Orders in Database: ${count}\n`);

        if (count === 0) {
            console.log('⚠️  NO ORDERS FOUND IN DATABASE!');
            console.log('   This is why your Excel file is empty.');
            console.log('   Create some orders first at: http://localhost:7000/orders.html\n');
        } else {
            console.log('✅ Orders exist! Fetching details...\n');
            
            // Get all orders
            const orders = await Order.find().limit(10).lean();
            
            console.log('📋 First 10 Orders:\n');
            orders.forEach((order, index) => {
                console.log(`${index + 1}. Order Number: ${order.orderNumber || 'N/A'}`);
                console.log(`   Date: ${new Date(order.createdAt).toLocaleString()}`);
                console.log(`   Retailer: ${order.retailerName || 'N/A'}`);
                console.log(`   Total: ₹${order.amount || 0}`);
                console.log(`   Status: ${order.status || 'N/A'}`);
                console.log(`   Payment: ${order.paymentStatus || 'N/A'}`);
                console.log(`   Items: ${order.items?.length || 0}`);
                console.log('');
            });

            console.log('\n✅ Your database HAS orders!');
            console.log('   If Excel is empty, try downloading again.');
            console.log('   Download from: Dashboard → Reports → Orders Report\n');
        }

        await mongoose.connection.close();
        console.log('✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkOrders();
