const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create reusable transporter
let transporter = null;

// Initialize email transporter
function initEmailService() {
  try {
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    // Only create transporter if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      transporter = nodemailer.createTransport(emailConfig);
      
      // Verify connection
      transporter.verify((error, success) => {
        if (error) {
          logger.warn('Email service not configured properly:', error.message);
          logger.info('Email notifications will be logged but not sent');
        } else {
          logger.info('✅ Email service ready');
        }
      });
    } else {
      logger.warn('Email credentials not configured. Email notifications disabled.');
    }
  } catch (error) {
    logger.error('Failed to initialize email service:', error);
  }
}

// Send email function
async function sendEmail(options) {
  const {
    to,
    subject,
    text,
    html,
    attachments = []
  } = options;

  // If email service is not configured, log and return
  if (!transporter) {
    logger.info('📧 Email (not sent - service not configured):');
    logger.info(`   To: ${to}`);
    logger.info(`   Subject: ${subject}`);
    return { sent: false, reason: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `"Iconic Smart CRM" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      text: text,
      html: html || text,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Email sent successfully to ${to}`);
    logger.debug(`   Message ID: ${info.messageId}`);
    
    return {
      sent: true,
      messageId: info.messageId,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('❌ Failed to send email:', error.message);
    return {
      sent: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// Email templates
const emailTemplates = {
  // Service Request Notification
  serviceRequest: (requestData) => {
    return {
      subject: `New Service Request - ${requestData.serviceId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .detail { margin: 10px 0; }
            .label { font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Service Request</h1>
            </div>
            <div class="content">
              <div class="detail"><span class="label">Service ID:</span> ${requestData.serviceId}</div>
              <div class="detail"><span class="label">Service Type:</span> ${requestData.serviceType}</div>
              <div class="detail"><span class="label">Product:</span> ${requestData.productType}</div>
              <div class="detail"><span class="label">Serial Number:</span> ${requestData.serialNumber}</div>
              <div class="detail"><span class="label">Priority:</span> ${requestData.priority}</div>
              <div class="detail"><span class="label">Description:</span> ${requestData.description}</div>
              <div class="detail"><span class="label">Customer:</span> ${requestData.customerName || 'N/A'}</div>
              <div class="detail"><span class="label">Phone:</span> ${requestData.customerPhone || 'N/A'}</div>
            </div>
            <div class="footer">
              <p>This is an automated notification from Iconic Smart CRM</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
New Service Request - ${requestData.serviceId}

Service Type: ${requestData.serviceType}
Product: ${requestData.productType}
Serial Number: ${requestData.serialNumber}
Priority: ${requestData.priority}
Description: ${requestData.description}
Customer: ${requestData.customerName || 'N/A'}
Phone: ${requestData.customerPhone || 'N/A'}

This is an automated notification from Iconic Smart CRM.
      `
    };
  },

  // Order Confirmation
  orderConfirmation: (orderData) => {
    return {
      subject: `Order Confirmation - ${orderData.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .detail { margin: 10px 0; }
            .label { font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; color: #667eea; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <div class="detail"><span class="label">Order Number:</span> ${orderData.orderNumber}</div>
              <div class="detail"><span class="label">Date:</span> ${new Date(orderData.createdAt).toLocaleDateString()}</div>
              <div class="detail"><span class="label">Items:</span> ${orderData.items.length} item(s)</div>
              <div class="detail"><span class="label">Subtotal:</span> ₹${orderData.subtotal.toFixed(2)}</div>
              <div class="detail"><span class="label">GST (${orderData.gstRate}%):</span> ₹${orderData.gstAmount.toFixed(2)}</div>
              <div class="total">Total Amount: ₹${orderData.amount.toFixed(2)}</div>
            </div>
            <div class="footer">
              <p>Thank you for your order!</p>
              <p>This is an automated notification from Iconic Smart CRM</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Order Confirmation - ${orderData.orderNumber}

Order Number: ${orderData.orderNumber}
Date: ${new Date(orderData.createdAt).toLocaleDateString()}
Items: ${orderData.items.length} item(s)
Subtotal: ₹${orderData.subtotal.toFixed(2)}
GST (${orderData.gstRate}%): ₹${orderData.gstAmount.toFixed(2)}
Total Amount: ₹${orderData.amount.toFixed(2)}

Thank you for your order!
      `
    };
  },

  // Invoice Email
  invoiceEmail: (invoiceData) => {
    return {
      subject: `Invoice - ${invoiceData.invoiceNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice Generated</h1>
            </div>
            <div class="content">
              <p>Your invoice has been generated successfully.</p>
              <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
              <p><strong>Order Number:</strong> ${invoiceData.orderNumber}</p>
              <p><strong>Amount:</strong> ₹${invoiceData.amount.toFixed(2)}</p>
              <p>Please find the attached PDF invoice.</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from Iconic Smart CRM</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Invoice Generated

Invoice Number: ${invoiceData.invoiceNumber}
Order Number: ${invoiceData.orderNumber}
Amount: ₹${invoiceData.amount.toFixed(2)}

Please find the attached PDF invoice.
      `
    };
  }
};

// Initialize on module load
initEmailService();

module.exports = {
  sendEmail,
  emailTemplates,
  initEmailService
};



