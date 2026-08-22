const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Order = require('../models/Order');
const Retailer = require('../models/Retailer');
const { auth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();
router.use(requireFeature('finance'));

// Ensure invoices directory exists
const invoicesDir = path.join(__dirname, '..', 'public', 'invoices');
if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
}

// Generate professional invoice PDF
function generateInvoicePDF(order, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // Header - Company Info
            doc.fontSize(24).fillColor('#667eea').text("CHARLIE'S CRM", 50, 50);
            doc.fontSize(10).fillColor('#666').text('www.charlieai.com', 50, 80);
            doc.text('Email: info@charlieai.com', 50, 95);
            doc.text('Phone: +91-XXXXXXXXXX', 50, 110);

            // Invoice Title
            doc.fontSize(20).fillColor('#000').text('TAX INVOICE', 400, 50, { align: 'right' });
            doc.fontSize(10).fillColor('#666');
            doc.text(`Invoice #: ${order.invoiceNumber}`, 400, 80, { align: 'right' });
            doc.text(`Order #: ${order.orderNumber}`, 400, 95, { align: 'right' });
            doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 400, 110, { align: 'right' });

            // Line separator
            doc.moveTo(50, 140).lineTo(550, 140).stroke();

            // Bill To Section
            doc.fontSize(12).fillColor('#000').text('BILL TO:', 50, 160);
            doc.fontSize(10).fillColor('#333');
            doc.text(order.retailerName || order.customer?.name || 'Customer', 50, 180);
            if (order.retailerEmail) doc.text(order.retailerEmail, 50, 195);
            if (order.retailerPhone) doc.text(order.retailerPhone, 50, 210);
            if (order.retailerGST) doc.text(`GST: ${order.retailerGST}`, 50, 225);
            
            // Billing Address
            if (order.billingAddress) {
                doc.text(`${order.billingAddress.street || ''}`, 50, 240);
                doc.text(`${order.billingAddress.city || ''}, ${order.billingAddress.state || ''} ${order.billingAddress.pincode || ''}`, 50, 255);
            }

            // Ship To Section (if different)
            if (order.shippingAddress) {
                doc.fontSize(12).fillColor('#000').text('SHIP TO:', 320, 160);
                doc.fontSize(10).fillColor('#333');
                doc.text(`${order.shippingAddress.street || ''}`, 320, 180);
                doc.text(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.pincode || ''}`, 320, 195);
            }

            // Table Header
            const tableTop = 300;
            doc.fontSize(10).fillColor('#fff');
            doc.rect(50, tableTop, 500, 25).fill('#667eea');
            
            doc.fillColor('#fff').text('Item', 60, tableTop + 8);
            doc.text('SKU', 250, tableTop + 8);
            doc.text('Qty', 350, tableTop + 8);
            doc.text('Rate', 410, tableTop + 8);
            doc.text('Amount', 480, tableTop + 8);

            // Table Rows
            let yPosition = tableTop + 35;
            doc.fillColor('#000');

            order.items.forEach((item, index) => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }

                const bgColor = index % 2 === 0 ? '#f7fafc' : '#fff';
                doc.rect(50, yPosition - 5, 500, 25).fill(bgColor);
                
                doc.fillColor('#000').fontSize(9);
                doc.text(item.name.substring(0, 30), 60, yPosition);
                doc.text(item.sku || item.productId || '-', 250, yPosition);
                doc.text(item.quantity.toString(), 350, yPosition);
                doc.text(`₹${item.price.toFixed(2)}`, 410, yPosition);
                doc.text(`₹${(item.total || item.price * item.quantity).toFixed(2)}`, 480, yPosition);
                
                yPosition += 25;
            });

            // Totals Section
            yPosition += 20;
            doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
            yPosition += 15;

            const totalsX = 400;
            doc.fontSize(10);
            doc.text('Subtotal:', totalsX, yPosition);
            doc.text(`₹${order.subtotal.toFixed(2)}`, 480, yPosition);
            yPosition += 20;

            doc.text(`GST (${order.gstRate}%):`, totalsX, yPosition);
            doc.text(`₹${order.gstAmount.toFixed(2)}`, 480, yPosition);
            yPosition += 20;

            doc.fontSize(12).fillColor('#667eea');
            doc.text('Total Amount:', totalsX, yPosition);
            doc.text(`₹${order.amount.toFixed(2)}`, 480, yPosition);

            // Footer
            doc.fontSize(8).fillColor('#666');
            doc.text('Thank you for your business!', 50, 750, { align: 'center' });
            doc.text('This is a computer generated invoice.', 50, 765, { align: 'center' });

            doc.end();
            stream.on('finish', () => resolve(outputPath));
            stream.on('error', reject);

        } catch (error) {
            reject(error);
        }
    });
}

// Generate and download invoice PDF
router.get('/generate/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Generate invoice number if not exists
        if (!order.invoiceNumber) {
            const count = await Order.countDocuments({ invoiceNumber: { $exists: true } });
            order.invoiceNumber = `INV${String(count + 1).padStart(6, '0')}`;
            order.invoiceGeneratedAt = new Date();
        }

        const filename = `invoice_${order.orderNumber}_${Date.now()}.pdf`;
        const filepath = path.join(invoicesDir, filename);

        await generateInvoicePDF(order, filepath);

        // Update order with PDF path
        order.invoicePdfPath = `/invoices/${filename}`;
        await order.save();

        logger.info(`📄 Invoice PDF generated: ${filename}`);

        // Send invoice email with PDF attachment
        if (order.retailerEmail || order.customer?.email) {
          try {
            const emailContent = emailTemplates.invoiceEmail({
              invoiceNumber: order.invoiceNumber,
              orderNumber: order.orderNumber,
              amount: order.amount
            });

            await sendEmail({
              to: order.retailerEmail || order.customer.email,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
              attachments: [{
                filename: `Invoice_${order.orderNumber}.pdf`,
                path: filepath
              }]
            });
            logger.info(`✅ Invoice email sent to ${order.retailerEmail || order.customer.email}`);
          } catch (emailError) {
            logger.warn('Failed to send invoice email:', emailError.message);
            // Continue even if email fails
          }
        }

        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
          notifications.invoiceGenerated(io, req.user.id, {
            invoiceNumber: order.invoiceNumber,
            orderNumber: order.orderNumber,
            amount: order.amount
          });
        }

        // Send PDF
        res.download(filepath, `Invoice_${order.orderNumber}.pdf`);

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get invoice PDF (view/download)
router.get('/view/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order || !order.invoicePdfPath) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const filepath = path.join(__dirname, '..', 'public', order.invoicePdfPath);
        
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: 'Invoice file not found' });
        }

        res.sendFile(filepath);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
