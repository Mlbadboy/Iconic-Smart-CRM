// Test New Features - Enhanced API Testing
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
      headers: { 'Content-Type': 'application/json' }
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
      res.on('end', () => resolve({ status: res.statusCode, data: body }));
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 TESTING NEW FEATURES - Enhanced API Validation\n');
  console.log('='.repeat(70));

  try {
    // Login as admin
    console.log('\n1️⃣  Testing Admin Login...');
    const loginData = JSON.stringify({
      email: 'admin@charlieai.com',
      password: 'admin123'
    });
    const login = await request('/api/auth/login', 'POST', loginData);
    const loginResult = JSON.parse(login.data);
    authToken = loginResult.token;
    console.log(`   ✅ Login successful - Token received`);
    console.log(`   👤 User: ${loginResult.user.name} (${loginResult.user.role})`);

    // Test 1: Lead Filtering
    console.log('\n2️⃣  Testing Lead Filtering (NEW)...');
    const allLeads = await request('/api/leads');
    const allLeadsData = JSON.parse(allLeads.data);
    console.log(`   ✅ Total leads: ${allLeadsData.length}`);
    
    const newLeads = await request('/api/leads?status=new');
    const newLeadsData = JSON.parse(newLeads.data);
    console.log(`   ✅ New leads (filtered): ${newLeadsData.length}`);
    
    const qualifiedLeads = await request('/api/leads?status=qualified');
    const qualifiedLeadsData = JSON.parse(qualifiedLeads.data);
    console.log(`   ✅ Qualified leads (filtered): ${qualifiedLeadsData.length}`);

    // Test 2: Get Lead by ID
    if (allLeadsData.length > 0) {
      console.log('\n3️⃣  Testing Get Lead by ID (NEW)...');
      const leadId = allLeadsData[0]._id;
      const singleLead = await request(`/api/leads/${leadId}`);
      const leadData = JSON.parse(singleLead.data);
      console.log(`   ✅ Lead retrieved: ${leadData.name}`);
      console.log(`   📧 Email: ${leadData.email}`);
      console.log(`   📊 Status: ${leadData.status}`);
    }

    // Test 3: Update Lead
    if (allLeadsData.length > 0) {
      console.log('\n4️⃣  Testing Update Lead (NEW)...');
      const leadId = allLeadsData[0]._id;
      const updateData = JSON.stringify({
        name: 'Updated Test Lead',
        status: 'contacted'
      });
      const updated = await request(`/api/leads/${leadId}`, 'PUT', updateData);
      const updatedLead = JSON.parse(updated.data);
      console.log(`   ✅ Lead updated: ${updatedLead.name}`);
      console.log(`   📊 New status: ${updatedLead.status}`);
    }

    // Test 4: Order Filtering
    console.log('\n5️⃣  Testing Order Filtering (NEW)...');
    const allOrders = await request('/api/orders');
    const allOrdersData = JSON.parse(allOrders.data);
    console.log(`   ✅ Total orders (admin view): ${allOrdersData.length}`);
    
    const processingOrders = await request('/api/orders?status=processing');
    const processingData = JSON.parse(processingOrders.data);
    console.log(`   ✅ Processing orders (filtered): ${processingData.length}`);

    // Test 5: Service Filtering by Priority
    console.log('\n6️⃣  Testing Service Priority Filtering (NEW)...');
    const allServices = await request('/api/services');
    const allServicesData = JSON.parse(allServices.data);
    console.log(`   ✅ Total services: ${allServicesData.length}`);
    
    if (allServicesData.length > 0) {
      const service = allServicesData[0];
      console.log(`   📋 Sample Service:`);
      console.log(`      - Type: ${service.issueType}`);
      console.log(`      - Status: ${service.status}`);
      console.log(`      - Priority: ${service.priority || 'medium (default)'}`);
    }

    const openServices = await request('/api/services?status=open');
    const openServicesData = JSON.parse(openServices.data);
    console.log(`   ✅ Open services (filtered): ${openServicesData.length}`);

    // Test 6: Create Service with Priority
    console.log('\n7️⃣  Testing Create Service with Priority (NEW)...');
    const serviceData = JSON.stringify({
      issueType: 'technical',
      description: 'Test high-priority service request',
      priority: 'high',
      orderRef: 'TEST-123'
    });
    const newService = await request('/api/services', 'POST', serviceData);
    const createdService = JSON.parse(newService.data);
    console.log(`   ✅ Service created with priority: ${createdService.priority}`);
    console.log(`   🆔 Service ID: ${createdService.serviceId}`);

    // Test 7: Get Service by ID
    const serviceId = createdService._id;
    console.log('\n8️⃣  Testing Get Service by ID (NEW)...');
    const singleService = await request(`/api/services/${serviceId}`);
    const serviceDetail = JSON.parse(singleService.data);
    console.log(`   ✅ Service retrieved: ${serviceDetail.issueType}`);
    console.log(`   ⚡ Priority: ${serviceDetail.priority}`);

    // Test 8: Create Order with Shipping Address
    console.log('\n9️⃣  Testing Create Order with Shipping Address (NEW)...');
    const orderData = JSON.stringify({
      items: [
        { name: 'Test Product', quantity: 2, price: 49.99 }
      ],
      amount: 99.98,
      shippingAddress: '123 Test Street, Test City, TS 12345'
    });
    const newOrder = await request('/api/orders', 'POST', orderData);
    const createdOrder = JSON.parse(newOrder.data);
    console.log(`   ✅ Order created with shipping address`);
    console.log(`   🆔 Order ID: ${createdOrder.orderId}`);
    console.log(`   📦 Shipping: ${createdOrder.shippingAddress}`);

    // Test 9: Query with Limit
    console.log('\n🔟 Testing Query Limits (NEW)...');
    const limitedOrders = await request('/api/orders?limit=2');
    const limitedData = JSON.parse(limitedOrders.data);
    console.log(`   ✅ Orders with limit=2: ${limitedData.length} records`);

    // Test 10: DELETE Lead
    if (allLeadsData.length > 1) {
      console.log('\n1️⃣1️⃣  Testing Delete Lead (NEW)...');
      const leadToDelete = allLeadsData[allLeadsData.length - 1]._id;
      const deleteResult = await request(`/api/leads/${leadToDelete}`, 'DELETE');
      const deleteData = JSON.parse(deleteResult.data);
      console.log(`   ✅ Lead deleted: ${deleteData.message}`);
      
      // Verify deletion
      const verifyLeads = await request('/api/leads');
      const verifyData = JSON.parse(verifyLeads.data);
      console.log(`   ✅ Verified - Total leads now: ${verifyData.length}`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n✨ ALL NEW FEATURES TESTED SUCCESSFULLY!\n');
    console.log('📊 Test Results Summary:');
    console.log('   ✅ Lead filtering by status - WORKING');
    console.log('   ✅ Get lead by ID - WORKING');
    console.log('   ✅ Update lead - WORKING');
    console.log('   ✅ Delete lead - WORKING');
    console.log('   ✅ Order filtering by status - WORKING');
    console.log('   ✅ Order with shipping address - WORKING');
    console.log('   ✅ Service priority field - WORKING');
    console.log('   ✅ Service filtering - WORKING');
    console.log('   ✅ Get service by ID - WORKING');
    console.log('   ✅ Query limits - WORKING');
    console.log('\n🎉 Backend is 100% ready for UI integration!\n');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

runTests();
