const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Order = require('./models/Order');
const Service = require('./models/Service');
const Delivery = require('./models/Delivery');
const MarketingAsset = require('./models/MarketingAsset');
const Lead = require('./models/Lead');
const Opportunity = require('./models/Opportunity');
const Contact = require('./models/Contact');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.yellow}▶${colors.reset} ${msg}`)
};

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/iconic-crm', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

// Clear existing data
async function clearDatabase() {
  log.section('Clearing existing data...');
  
  try {
    await User.deleteMany({});
    await Order.deleteMany({});
    await Service.deleteMany({});
    await Delivery.deleteMany({});
    await MarketingAsset.deleteMany({});
    await Lead.deleteMany({});
    await Opportunity.deleteMany({});
    await Contact.deleteMany({});
    
    log.success('Database cleared');
  } catch (error) {
    log.error(`Failed to clear database: ${error.message}`);
  }
}

// Seed Users
async function seedUsers() {
  log.section('Seeding users...');
  
  const users = [
    {
      name: 'Admin User',
      email: 'admin@iconic-crm.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin'
    },
    {
      name: 'John Manager',
      email: 'manager@iconic-crm.com',
      password: await bcrypt.hash('manager123', 10),
      role: 'manager'
    },
    {
      name: 'Sarah Sales',
      email: 'sales@iconic-crm.com',
      password: await bcrypt.hash('sales123', 10),
      role: 'user'
    },
    {
      name: 'Mike Support',
      email: 'support@iconic-crm.com',
      password: await bcrypt.hash('support123', 10),
      role: 'user'
    },
    {
      name: 'Demo Customer',
      email: 'customer@example.com',
      password: await bcrypt.hash('demo123', 10),
      role: 'user'
    }
  ];

  const createdUsers = await User.insertMany(users);
  log.success(`Created ${createdUsers.length} users`);
  return createdUsers;
}

// Seed Contacts
async function seedContacts() {
  log.section('Seeding contacts...');
  
  const contacts = [
    {
      name: 'Acme Corporation',
      email: 'contact@acme-corp.com',
      phone: '+1-555-0101',
      company: 'Acme Corp',
      position: 'CEO',
      address: '123 Business St, New York, NY 10001',
      notes: 'Premium enterprise client'
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@techstart.io',
      phone: '+1-555-0102',
      company: 'TechStart Inc',
      position: 'CTO',
      address: '456 Innovation Ave, San Francisco, CA 94102',
      notes: 'Interested in enterprise package'
    },
    {
      name: 'Robert Johnson',
      email: 'r.johnson@globalnet.com',
      phone: '+1-555-0103',
      company: 'GlobalNet Solutions',
      position: 'VP Sales',
      address: '789 Commerce Blvd, Chicago, IL 60601',
      notes: 'Monthly retainer client'
    },
    {
      name: 'Emily Davis',
      email: 'emily.d@innovate.com',
      phone: '+1-555-0104',
      company: 'Innovate Labs',
      position: 'Product Manager',
      notes: 'Potential partnership opportunity'
    },
    {
      name: 'Michael Brown',
      email: 'mbrown@startup.io',
      phone: '+1-555-0105',
      company: 'Startup Hub',
      position: 'Founder',
      notes: 'Referral from existing client'
    }
  ];

  const createdContacts = await Contact.insertMany(contacts);
  log.success(`Created ${createdContacts.length} contacts`);
  return createdContacts;
}

// Seed Leads
async function seedLeads() {
  log.section('Seeding leads...');
  
  const leads = [
    {
      leadId: 'LEAD-001',
      name: 'Enterprise Software Deal',
      email: 'procurement@bigcorp.com',
      phone: '+1-555-0201',
      company: 'BigCorp Industries',
      status: 'new',
      source: 'website',
      value: 50000,
      notes: 'Interested in complete CRM solution'
    },
    {
      leadId: 'LEAD-002',
      name: 'SMB Package Inquiry',
      email: 'owner@smallbiz.com',
      phone: '+1-555-0202',
      company: 'Small Business Co',
      status: 'contacted',
      source: 'referral',
      value: 5000,
      notes: 'Looking for basic features'
    },
    {
      leadId: 'LEAD-003',
      name: 'Custom Integration Project',
      email: 'it@mediumtech.com',
      phone: '+1-555-0203',
      company: 'MediumTech LLC',
      status: 'qualified',
      source: 'linkedin',
      value: 25000,
      notes: 'Needs Salesforce integration'
    },
    {
      leadId: 'LEAD-004',
      name: 'Startup Trial Request',
      email: 'founder@newventure.io',
      phone: '+1-555-0204',
      company: 'New Venture',
      status: 'new',
      source: 'social_media',
      value: 2000,
      notes: 'Price-sensitive, looking for discounts'
    },
    {
      leadId: 'LEAD-005',
      name: 'Annual License Renewal',
      email: 'admin@existingclient.com',
      phone: '+1-555-0205',
      company: 'Existing Client Inc',
      status: 'converted',
      source: 'existing_customer',
      value: 15000,
      notes: 'Happy with service, ready to renew'
    }
  ];

  const createdLeads = await Lead.insertMany(leads);
  log.success(`Created ${createdLeads.length} leads`);
  return createdLeads;
}

// Seed Opportunities
async function seedOpportunities() {
  log.section('Seeding opportunities...');
  
  const opportunities = [
    {
      name: 'Q1 Enterprise Deal - Acme Corp',
      value: 75000,
      stage: 'negotiation',
      probability: 75,
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      description: '3-year enterprise license with premium support',
      contactInfo: 'John Doe, CEO, john@acme.com'
    },
    {
      name: 'Mid-Market Expansion - TechStart',
      value: 35000,
      stage: 'proposal',
      probability: 60,
      closeDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      description: 'Department-wide rollout for 50 users',
      contactInfo: 'Jane Smith, CTO'
    },
    {
      name: 'SMB Bundle - Local Retail',
      value: 8000,
      stage: 'qualification',
      probability: 40,
      closeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      description: 'Basic package with inventory integration',
      contactInfo: 'Store Manager'
    },
    {
      name: 'Custom Development - FinTech',
      value: 120000,
      stage: 'prospecting',
      probability: 25,
      closeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      description: 'Custom CRM with compliance features',
      contactInfo: 'Compliance Officer'
    },
    {
      name: 'Partnership Deal - Consulting Firm',
      value: 200000,
      stage: 'closed-won',
      probability: 100,
      closeDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      description: 'White-label partnership agreement',
      contactInfo: 'Managing Partner'
    }
  ];

  const createdOpportunities = await Opportunity.insertMany(opportunities);
  log.success(`Created ${createdOpportunities.length} opportunities`);
  return createdOpportunities;
}

// Seed Orders
async function seedOrders(users) {
  log.section('Seeding orders...');
  
  const customerId = users[4]._id; // Demo Customer
  
  const orders = [
    {
      userId: customerId,
      items: [
        { name: 'CRM Basic License', quantity: 5, price: 49.99 },
        { name: 'Email Integration Module', quantity: 1, price: 99.99 }
      ],
      amount: 349.94,
      paymentStatus: 'paid',
      orderStatus: 'completed',
      shippingAddress: '123 Main St, Anytown, USA'
    },
    {
      userId: customerId,
      items: [
        { name: 'CRM Pro License', quantity: 10, price: 99.99 },
        { name: 'Advanced Analytics', quantity: 1, price: 199.99 }
      ],
      amount: 1199.89,
      paymentStatus: 'paid',
      orderStatus: 'processing',
      shippingAddress: '456 Business Ave, Metro City, USA'
    },
    {
      userId: customerId,
      items: [
        { name: 'API Access Token', quantity: 2, price: 29.99 }
      ],
      amount: 59.98,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      shippingAddress: '789 Tech Park, Silicon Valley, USA'
    },
    {
      userId: customerId,
      items: [
        { name: 'Custom Integration Service', quantity: 1, price: 499.99 }
      ],
      amount: 499.99,
      paymentStatus: 'paid',
      orderStatus: 'shipped',
      shippingAddress: '321 Enterprise Blvd, Corporate City, USA'
    },
    {
      userId: customerId,
      items: [
        { name: 'Training Session (5 users)', quantity: 1, price: 299.99 },
        { name: 'Documentation Package', quantity: 1, price: 49.99 }
      ],
      amount: 349.98,
      paymentStatus: 'paid',
      orderStatus: 'completed',
      shippingAddress: '555 Learning Lane, Education City, USA'
    }
  ];

  const createdOrders = await Order.insertMany(orders);
  log.success(`Created ${createdOrders.length} orders`);
  return createdOrders;
}

// Seed Services
async function seedServices(users, orders) {
  log.section('Seeding service requests...');
  
  const customerId = users[4]._id;
  const supportId = users[3]._id;
  
  const services = [
    {
      orderRef: orders[0]._id,
      userId: customerId,
      issueType: 'technical',
      description: 'Unable to sync email contacts with CRM',
      status: 'open',
      priority: 'high',
      assignedTo: supportId
    },
    {
      orderRef: orders[1]._id,
      userId: customerId,
      issueType: 'billing',
      description: 'Question about pro license pricing for additional users',
      status: 'in-progress',
      priority: 'medium',
      assignedTo: supportId
    },
    {
      orderRef: orders[0]._id,
      userId: customerId,
      issueType: 'feature_request',
      description: 'Request for mobile app support',
      status: 'resolved',
      priority: 'low',
      assignedTo: supportId,
      resolution: 'Mobile app is currently in beta testing'
    },
    {
      orderRef: orders[3]._id,
      userId: customerId,
      issueType: 'technical',
      description: 'API rate limit exceeded errors',
      status: 'open',
      priority: 'high',
      assignedTo: supportId
    }
  ];

  const createdServices = await Service.insertMany(services);
  log.success(`Created ${createdServices.length} service requests`);
  return createdServices;
}

// Seed Deliveries
async function seedDeliveries(orders) {
  log.section('Seeding deliveries...');
  
  const deliveries = [
    {
      orderRef: orders[0]._id,
      trackingNumber: 'ICON-2024-001',
      courier: 'FastShip Express',
      status: 'delivered',
      estimatedDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      actualDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      currentLocation: 'Delivered'
    },
    {
      orderRef: orders[1]._id,
      trackingNumber: 'ICON-2024-002',
      courier: 'QuickPost',
      status: 'in_transit',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      currentLocation: 'Distribution Center - Chicago'
    },
    {
      orderRef: orders[3]._id,
      trackingNumber: 'ICON-2024-003',
      courier: 'GlobalShip',
      status: 'shipped',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      currentLocation: 'Origin Facility'
    }
  ];

  const createdDeliveries = await Delivery.insertMany(deliveries);
  log.success(`Created ${createdDeliveries.length} deliveries`);
  return createdDeliveries;
}

// Seed Marketing Assets
async function seedMarketingAssets() {
  log.section('Seeding marketing assets...');
  
  const assets = [
    {
      title: 'Q1 2024 Product Launch Campaign',
      description: 'Email campaign for new CRM features',
      assetType: 'email_template',
      fileUrl: '/assets/email-q1-2024.html',
      active: true,
      tags: ['email', 'launch', 'product']
    },
    {
      title: 'Social Media Banner - Summer Sale',
      description: '20% discount promotion banner',
      assetType: 'image',
      fileUrl: '/assets/summer-sale-banner.jpg',
      active: true,
      tags: ['social', 'promotion', 'banner']
    },
    {
      title: 'Customer Success Stories Video',
      description: 'Testimonial compilation video',
      assetType: 'video',
      fileUrl: '/assets/testimonials-2024.mp4',
      active: true,
      tags: ['video', 'testimonial', 'case-study']
    },
    {
      title: 'Holiday Newsletter Template',
      description: 'Year-end newsletter design',
      assetType: 'email_template',
      fileUrl: '/assets/holiday-newsletter.html',
      active: false,
      tags: ['email', 'holiday', 'newsletter']
    },
    {
      title: 'Product Demo Presentation',
      description: 'Sales presentation deck',
      assetType: 'document',
      fileUrl: '/assets/product-demo.pdf',
      active: true,
      tags: ['sales', 'presentation', 'demo']
    }
  ];

  const createdAssets = await MarketingAsset.insertMany(assets);
  log.success(`Created ${createdAssets.length} marketing assets`);
  return createdAssets;
}

// Main seeding function
async function seedDatabase() {
  console.log('\n🌱 Starting database seeding...\n');
  
  try {
    await connectDB();
    await clearDatabase();
    
    const users = await seedUsers();
    const contacts = await seedContacts();
    const leads = await seedLeads();
    const opportunities = await seedOpportunities();
    const orders = await seedOrders(users);
    const services = await seedServices(users, orders);
    const deliveries = await seedDeliveries(orders);
    const assets = await seedMarketingAssets();
    
    log.section('\n📊 Seeding Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Contacts: ${contacts.length}`);
    console.log(`   Leads: ${leads.length}`);
    console.log(`   Opportunities: ${opportunities.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log(`   Services: ${services.length}`);
    console.log(`   Deliveries: ${deliveries.length}`);
    console.log(`   Marketing Assets: ${assets.length}`);
    
    log.section('\n🔑 Demo Login Credentials:');
    console.log(`   Admin: admin@iconic-crm.com / admin123`);
    console.log(`   Manager: manager@iconic-crm.com / manager123`);
    console.log(`   Sales: sales@iconic-crm.com / sales123`);
    console.log(`   Support: support@iconic-crm.com / support123`);
    console.log(`   Customer: customer@example.com / demo123\n`);
    
    log.success('✨ Database seeding completed successfully!\n');
    
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log.info('Database connection closed');
  }
}

// Run seeding
seedDatabase();
