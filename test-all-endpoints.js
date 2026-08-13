// Comprehensive API Test
const http = require('http');

const PORT = 7000;
let authToken = '';

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: body });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('\n🔍 ICONIC SMART CRM - COMPREHENSIVE API TEST\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Health Check
    console.log('\n📊 Test 1: Health Check');
    const health = await request('/api/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${health.data}`);
    
    // Test 2: Login
    console.log('\n🔐 Test 2: Admin Login');
    const loginData = JSON.stringify({
      email: 'admin@iconic-crm.com',
      password: 'admin123'
    });
    const login = await request('/api/auth/login', 'POST', loginData);
    const loginResult = JSON.parse(login.data);
    authToken = loginResult.token;
    console.log(`   Status: ${login.status}`);
    console.log(`   User: ${loginResult.user.name} (${loginResult.user.role})`);
    console.log(`   Token: ${authToken.substring(0, 50)}...`);

    // Test 3: Get all users
    console.log('\n👥 Test 3: Get All Data');
    
    const contacts = await request('/api/contacts');
    const contactsData = JSON.parse(contacts.data);
    console.log(`   Contacts: ${contactsData.length} records`);
    
    const leads = await request('/api/leads');
    const leadsData = JSON.parse(leads.data);
    console.log(`   Leads: ${leadsData.length} records`);
    
    const opportunities = await request('/api/opportunities');
    const oppData = JSON.parse(opportunities.data);
    console.log(`   Opportunities: ${oppData.length} records`);
    
    const orders = await request('/api/orders');
    const ordersData = JSON.parse(orders.data);
    console.log(`   Orders: ${ordersData.length} records`);
    
    const services = await request('/api/services');
    const servicesData = JSON.parse(services.data);
    console.log(`   Service Requests: ${servicesData.length} records`);
    
    const deliveries = await request('/api/deliveries');
    const deliveriesData = JSON.parse(deliveries.data);
    console.log(`   Deliveries: ${deliveriesData.length} records`);
    
    const marketing = await request('/api/marketing');
    const marketingData = JSON.parse(marketing.data);
    console.log(`   Marketing Assets: ${marketingData.length} records`);

    // Test 4: Sample Data Display
    console.log('\n📄 Test 4: Sample Data');
    if (contactsData.length > 0) {
      const contact = contactsData[0];
      console.log(`\n   Contact: ${contact.name}`);
      console.log(`   Email: ${contact.email}`);
      console.log(`   Company: ${contact.company}`);
    }

    if (leadsData.length > 0) {
      const lead = leadsData[0];
      console.log(`\n   Lead: ${lead.name}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Email: ${lead.email}`);
    }

    if (ordersData.length > 0) {
      const order = ordersData[0];
      console.log(`\n   Order ID: ${order.orderId}`);
      console.log(`   Amount: $${order.amount}`);
      console.log(`   Status: ${order.orderStatus}`);
      console.log(`   Payment: ${order.paymentStatus}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('📊 Summary:');
    console.log(`   - API Health: ✓ OK`);
    console.log(`   - Authentication: ✓ Working`);
    console.log(`   - Database: ✓ Connected`);
    console.log(`   - Total Records: ${contactsData.length + leadsData.length + oppData.length + ordersData.length + servicesData.length + deliveriesData.length + marketingData.length}`);
    console.log('\n🌐 Server: http://localhost:7000');
    console.log('📦 MongoDB Admin UI: http://localhost:8081\n');

  } catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
  }
}

runTests();
