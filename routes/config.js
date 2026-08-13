const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { auth, adminOnly } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const logger = require('../services/logger');

// Only admins can access configuration
router.use(auth);
router.use(adminOnly);

// Get current configuration
router.get('/current', async (req, res) => {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const config = {
      email: {},
      dns: {},
      server: {}
    };

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();

          // Email config
          if (key.startsWith('EMAIL_')) {
            config.email[key] = key.includes('PASSWORD') ? '***' : value;
          }
          // DNS config
          else if (key.startsWith('DOMAIN_') || key.startsWith('FRONTEND_') || 
                   key.startsWith('API_URL') || key.startsWith('CORS_')) {
            config.dns[key] = value;
          }
          // Server config
          else if (key.startsWith('PORT') || key.startsWith('NODE_ENV') || 
                   key.startsWith('MONGO_URI') || key.startsWith('JWT_')) {
            config.server[key] = key.includes('SECRET') || key.includes('URI') ? '***' : value;
          }
        }
      });
    }

    res.json(config);
  } catch (error) {
    logger.error('Error reading config:', error);
    res.status(500).json({ message: 'Failed to read configuration' });
  }
});

// Save email configuration
router.post('/email', async (req, res) => {
  try {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = req.body;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
      return res.status(400).json({ message: 'All email fields are required' });
    }

    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    // Read existing .env if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add email configuration
    const emailConfig = {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_USER,
      EMAIL_PASSWORD
    };

    // Parse existing .env
    const lines = envContent.split('\n');
    const newLines = [];
    const emailKeys = Object.keys(emailConfig);
    const existingKeys = new Set();

    // Process existing lines
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key] = trimmed.split('=');
        if (emailKeys.includes(key)) {
          // Update existing email config
          newLines.push(`${key}=${emailConfig[key]}`);
          existingKeys.add(key);
        } else {
          // Keep other config
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    });

    // Add missing email config
    emailKeys.forEach(key => {
      if (!existingKeys.has(key)) {
        newLines.push(`${key}=${emailConfig[key]}`);
      }
    });

    // Write updated .env
    fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');

    logger.info('Email configuration updated');
    
    // Reinitialize email service
    const { initEmailService } = require('../services/emailService');
    initEmailService();

    res.json({ 
      message: 'Email configuration saved successfully',
      note: 'Please restart the server for changes to take full effect'
    });
  } catch (error) {
    logger.error('Error saving email config:', error);
    res.status(500).json({ message: 'Failed to save email configuration' });
  }
});

// Save DNS configuration
router.post('/dns', async (req, res) => {
  try {
    const { DOMAIN_NAME, FRONTEND_URL, API_URL, CORS_ORIGINS } = req.body;

    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    // Read existing .env if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add DNS configuration
    const dnsConfig = {};
    if (DOMAIN_NAME) dnsConfig.DOMAIN_NAME = DOMAIN_NAME;
    if (FRONTEND_URL) dnsConfig.FRONTEND_URL = FRONTEND_URL;
    if (API_URL) dnsConfig.API_URL = API_URL;
    if (CORS_ORIGINS) dnsConfig.CORS_ORIGINS = CORS_ORIGINS;

    // Parse existing .env
    const lines = envContent.split('\n');
    const newLines = [];
    const dnsKeys = Object.keys(dnsConfig);
    const existingKeys = new Set();

    // Process existing lines
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key] = trimmed.split('=');
        if (dnsKeys.includes(key)) {
          // Update existing DNS config
          newLines.push(`${key}=${dnsConfig[key]}`);
          existingKeys.add(key);
        } else {
          // Keep other config
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    });

    // Add missing DNS config
    dnsKeys.forEach(key => {
      if (!existingKeys.has(key)) {
        newLines.push(`${key}=${dnsConfig[key]}`);
      }
    });

    // Write updated .env
    fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');

    logger.info('DNS configuration updated');

    res.json({ 
      message: 'DNS configuration saved successfully',
      note: 'Please restart the server for changes to take full effect'
    });
  } catch (error) {
    logger.error('Error saving DNS config:', error);
    res.status(500).json({ message: 'Failed to save DNS configuration' });
  }
});

// Test email connection
router.post('/test-email', async (req, res) => {
  try {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = req.body;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
      return res.status(400).json({ message: 'All email fields are required' });
    }

    // Temporarily set environment variables for testing
    process.env.EMAIL_HOST = EMAIL_HOST;
    process.env.EMAIL_PORT = EMAIL_PORT;
    process.env.EMAIL_USER = EMAIL_USER;
    process.env.EMAIL_PASSWORD = EMAIL_PASSWORD;

    // Reinitialize email service with test credentials
    const { initEmailService } = require('../services/emailService');
    initEmailService();

    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to send a test email
    const testResult = await sendEmail({
      to: EMAIL_USER,
      subject: 'Test Email - Iconic Smart CRM',
      html: `
        <h2>✅ Email Configuration Test</h2>
        <p>This is a test email from Iconic Smart CRM.</p>
        <p>If you received this email, your email configuration is working correctly!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
      `,
      text: 'This is a test email from Iconic Smart CRM. If you received this, your email configuration is working correctly!'
    });

    if (testResult.sent) {
      res.json({ 
        success: true,
        message: 'Test email sent successfully! Check your inbox.',
        messageId: testResult.messageId
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: testResult.reason || testResult.error || 'Failed to send test email'
      });
    }
  } catch (error) {
    logger.error('Error testing email:', error);
    res.status(500).json({ 
      success: false,
      message: `Email test failed: ${error.message}` 
    });
  }
});

module.exports = router;

