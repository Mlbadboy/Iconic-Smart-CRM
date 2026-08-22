const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');

async function runCommand(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🏃 Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command ${command} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('🏁 Starting Deterministic Test Environment...');
  let mongoServer;

  try {
    // 1. Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    console.log(`✅ In-Memory MongoDB ready: ${mongoUri}`);

    // Set Environment Variables
    process.env.MONGO_URI = mongoUri;
    process.env.NODE_ENV = 'test';
    process.env.PORT = '7001';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt';
    process.env.TEST_URL = 'http://localhost:7001';

    // 2. Seed Database
    console.log('🌱 Seeding database...');
    await runCommand('node', ['seed.js'], { MONGO_URI: mongoUri });

    // 3. Start Express Server In-Process
    console.log('🚀 Starting Express Server...');
    require('./server.js');

    // Wait 3 seconds for server to initialize and connect to DB
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('✅ Express Server is ready! Running tests...');

    // 4. Run Audit Regression Tests
    console.log('🧪 Running audit regression tests...');
    await runCommand('node', ['test-crm-audit-regression.js'], process.env);

    // 5. Run Features E2E Tests
    console.log('🧪 Running comprehensive feature tests...');
    await runCommand('node', ['test-all-features.js'], process.env);

    // 6. Run Multi-Tenant E2E Tests
    console.log('🧪 Running multi-tenant & multi-company E2E tests...');
    await runCommand('node', ['scratch/test-multitenant-e2e.js'], process.env);

    // 7. Run SaaS Subdomain & White-Label E2E Tests
    console.log('🧪 Running SaaS subdomain & white-label E2E tests...');
    await runCommand('node', ['scratch/test-saas-multitenant-e2e.js'], process.env);

    // 8. Run Simplified API Access & One-Click Handoff Tests
    console.log('🧪 Running simplified API access tests...');
    await runCommand('node', ['scratch/test-simple-api-access.js'], process.env);

    // 9. Run External Partner (Salesforce / Postman) Simulation Tests
    console.log('🧪 Running external partner workflow simulation tests...');
    await runCommand('node', ['scratch/test-external-partner-workflow.js'], process.env);

    // 10. Run API Usage & Serial Validation Analytics Tests
    console.log('🧪 Running API usage & serial validation analytics tests...');
    await runCommand('node', ['scratch/test-api-analytics.js'], process.env);

    // 11. Run Two-Level Reporting & Platform Analytics Tests
    console.log('🧪 Running two-level reporting & platform analytics tests...');
    await runCommand('node', ['scratch/test-two-level-reporting.js'], process.env);

    // 12. Run Tenant Control, Feature Entitlements & Notifications Tests
    console.log('🧪 Running tenant control & feature entitlements tests...');
    await runCommand('node', ['scratch/test-tenant-control-entitlements.js'], process.env);

    // 13. Run 18-Feature Deep Entitlement & Coverage Tests
    console.log('🧪 Running 18-feature deep entitlement & coverage tests...');
    await runCommand('node', ['scratch/test-feature-coverage.js'], process.env);

    // 14. Run Company Admin RBAC, Organization & Lockout Tests
    console.log('🧪 Running Company Admin RBAC, Organization & Lockout tests...');
    await runCommand('node', ['scratch/test-company-admin-rbac.js'], process.env);

    // 15. Run Real Browser & Acceptance Lifecycle Sequence Tests
    console.log('🧪 Running real browser & acceptance lifecycle sequence tests...');
    await runCommand('node', ['scratch/test-browser-acceptance-sequence.js'], process.env);

    // 16. Run Authentication Request Loop & Rate Limiting Stability Tests
    console.log('🧪 Running authentication request loop & rate limiting stability tests...');
    await runCommand('node', ['scratch/test-auth-request-loop.js'], process.env);

    // 17. Run Tenant-Scoped Bulk CSV Import Center Tests
    console.log('🧪 Running tenant-scoped Bulk CSV Import Center tests...');
    await runCommand('node', ['scratch/test-bulk-import.js'], process.env);

    // 18. Run Enterprise Multi-Tenant WhatsApp Marketing Platform Tests
    console.log('🧪 Running multi-tenant WhatsApp Marketing Platform tests...');
    await runCommand('node', ['scratch/run-whatsapp-suite.js'], process.env);

    // 19. Run Omnichannel Social + Meta Ads + Content Studio + Holiday Calendar Tests
    console.log('🧪 Running Omnichannel Marketing Command Center tests...');
    await runCommand('node', ['scratch/test-omnichannel-marketing-suite.js'], process.env);

    // 20. Run Campaign Preflight, Spend Limits & Closed-Loop CRM Attribution Tests
    console.log('🧪 Running Campaign Preflight & Closed-Loop CRM Attribution tests...');
    await runCommand('node', ['scratch/test-preflight-closed-loop-suite.js'], process.env);

    console.log('🎉 All test suites passed successfully!');
    
    // Clean up
    await mongoose.connection.close();
    await mongoServer.stop();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test environment execution failed:', error.message);
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(1);
  }
}

main();
