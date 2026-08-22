const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`)
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function checkNodeVersion() {
  log.title('🔍 Checking System Requirements');
  
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));
  
  if (majorVersion >= 14) {
    log.success(`Node.js ${nodeVersion} detected`);
    return true;
  } else {
    log.error(`Node.js ${nodeVersion} detected. Version 14+ required.`);
    return false;
  }
}

async function checkMongoDB() {
  try {
    execSync('mongod --version', { stdio: 'pipe' });
    log.success('MongoDB detected on system');
    return true;
  } catch (error) {
    log.warn('MongoDB not detected locally (Atlas/remote DB required)');
    return false;
  }
}

async function createEnvFile() {
  log.title('⚙️  Environment Configuration');
  
  if (fs.existsSync('.env')) {
    const overwrite = await question('📄 .env file exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      log.info('Keeping existing .env file');
      return;
    }
  }

  console.log('\nLet\'s configure your environment:\n');

  const mongoUri = await question('MongoDB URI (press Enter for default local): ');
  const port = await question('Server Port (press Enter for 5000): ');
  const jwtSecret = await question('JWT Secret (press Enter to generate): ');
  const nodeEnv = await question('Environment (development/production) [development]: ');

  const envContent = `# Iconic Smart CRM Configuration
# Generated on ${new Date().toISOString()}

# MongoDB Connection
MONGO_URI=${mongoUri || 'mongodb://localhost:27017/iconic-crm'}

# Server Configuration
PORT=${port || '5000'}
NODE_ENV=${nodeEnv || 'development'}

# Authentication
JWT_SECRET=${jwtSecret || generateRandomString(64)}
JWT_EXPIRE=7d

# Email Configuration (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# File Upload Limits
MAX_FILE_SIZE=5242880
`;

  fs.writeFileSync('.env', envContent);
  log.success('.env file created successfully');
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function installDependencies() {
  log.title('📦 Installing Dependencies');
  
  const install = await question('Install npm dependencies? (y/n): ');
  
  if (install.toLowerCase() === 'y') {
    try {
      log.info('Running npm install... (this may take a few minutes)');
      execSync('npm install', { stdio: 'inherit' });
      log.success('Dependencies installed successfully');
    } catch (error) {
      log.error('Failed to install dependencies');
      log.info('Please run "npm install" manually');
    }
  } else {
    log.info('Skipped dependency installation');
  }
}

async function seedDatabase() {
  log.title('🌱 Database Seeding');
  
  const seed = await question('Populate database with demo data? (y/n): ');
  
  if (seed.toLowerCase() === 'y') {
    try {
      log.info('Seeding database with sample data...');
      execSync('node seed.js', { stdio: 'inherit' });
      log.success('Database seeded successfully');
    } catch (error) {
      log.error('Failed to seed database');
      log.info('You can run "npm run seed" later');
    }
  } else {
    log.info('Skipped database seeding');
  }
}

async function createDirectories() {
  log.title('📁 Creating Directory Structure');
  
  const dirs = [
    'uploads',
    'uploads/invoices',
    'uploads/assets',
    'logs'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      log.success(`Created ${dir}/`);
    }
  });
}

async function displayNextSteps() {
  log.title('🎉 Setup Complete!');
  
  console.log('Next steps:\n');
  console.log('  1. Review your .env file and update if needed');
  console.log('  2. Start the server:');
  console.log(`     ${colors.bright}npm start${colors.reset} (production)`);
  console.log(`     ${colors.bright}npm run dev${colors.reset} (development with auto-reload)\n`);
  console.log('  3. Access the API:');
  console.log(`     ${colors.blue}http://localhost:5000/api/health${colors.reset}\n`);
  console.log('  4. Default login (if seeded):');
  console.log(`     Email: ${colors.bright}admin@charlieai.com${colors.reset}`);
  console.log(`     Password: ${colors.bright}admin123${colors.reset}\n`);
  console.log('📚 Documentation: See README.md for API endpoints\n');
}

async function main() {
  console.log(`
${colors.bright}${colors.blue}╔═══════════════════════════════════════════════════════╗
║                                                       ║
║            🚀 ICONIC SMART CRM SETUP 🚀              ║
║              Automated Installation Wizard           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝${colors.reset}
  `);

  try {
    // Step 1: Check requirements
    const nodeOk = await checkNodeVersion();
    if (!nodeOk) {
      process.exit(1);
    }
    await checkMongoDB();

    // Step 2: Environment configuration
    await createEnvFile();

    // Step 3: Create directories
    await createDirectories();

    // Step 4: Install dependencies
    await installDependencies();

    // Step 5: Seed database
    await seedDatabase();

    // Step 6: Display next steps
    await displayNextSteps();

  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
main();
