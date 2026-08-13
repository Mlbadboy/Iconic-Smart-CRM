const express = require('express');
const Order = require('../models/Order');
const Retailer = require('../models/Retailer');
const { auth } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { notifications } = require('../services/notificationService');
const logger = require('../services/logger');

const router = express.Router();

// Create order with retailer and GST calculation
router.post('/', auth, async (req, res) => {
  try {
    const { 
      retailerId, 
      items, 
      gstRate,
      billingAddress,
      shippingAddress,
      notes,
      paymentMethod
    } = req.body;

    // Get retailer details
    let retailerData = {};
    if (retailerId) {
      const retailer = await Retailer.findById(retailerId);
      if (retailer) {
        retailerData = {
          retailerId: retailer._id,
          retailerName: retailer.retailerName,
          retailerEmail: retailer.email,
          retailerPhone: retailer.phone,
          retailerGST: retailer.gstNumber,
          customer: {
            name: retailer.retailerName,
            email: retailer.email,
            phone: retailer.phone
          }
        };
      }
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return {
        ...item,
        total: itemTotal
      };
    });

    const gst = gstRate || 18;
    const gstAmount = (subtotal * gst) / 100;
    const totalAmount = subtotal + gstAmount;

    // Create order
    const order = new Order({
      ...retailerData,
      userId: req.user.id,
      items: processedItems,
      subtotal,
      gstRate: gst,
      gstAmount,
      amount: totalAmount,
      billingAddress: billingAddress || retailerData.billingAddress,
      shippingAddress: shippingAddress || retailerData.shippingAddress,
      deliveryAddress: shippingAddress ? 
        `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.pincode}` : '',
      notes,
      paymentMethod: paymentMethod || 'pending',
      orderStatus: 'confirmed',
      status: 'confirmed'
    });

    await order.save();

    // Update retailer order history
    if (retailerId) {
      await Retailer.findByIdAndUpdate(retailerId, {
        $inc: { totalOrders: 1, totalAmount: totalAmount },
        $set: { lastOrderDate: new Date() },
        $push: {
          orderHistory: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: totalAmount,
            date: new Date()
          }
        }
      });
    }

    logger.info(`✅ Order Created: ${order.orderNumber}`);
    logger.info(`   Retailer: ${order.retailerName || 'Direct'}`);
    logger.info(`   Items: ${items.length}`);
    logger.info(`   Total: ₹${totalAmount.toFixed(2)} (incl. ${gst}% GST)`);

    // Send order confirmation email
    if (order.retailerEmail || order.customer?.email) {
      try {
        const emailContent = emailTemplates.orderConfirmation(order);
        await sendEmail({
          to: order.retailerEmail || order.customer.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });
      } catch (emailError) {
        logger.warn('Failed to send order confirmation email:', emailError.message);
        // Don't fail the order creation if email fails
      }
    }

    // Send real-time notification
    const io = req.app.get('io');
    if (io) {
      notifications.orderCreated(io, req.user.id, order);
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(400).json({ message: err.message });
  }
});

// Get orders (with filtering)
router.get('/', auth, async (req, res) => {
  try {
    const { userId, status, limit } = req.query;
    let query = {};
    
    // Admins can see all orders, users only see their own
    if (req.user.role === 'admin') {
      if (userId) query.userId = userId;
      if (status) query.orderStatus = status;
    } else {
      query.userId = req.user.id;
      if (status) query.orderStatus = status;
    }
    
    let ordersQuery = Order.find(query).populate('userId', 'name email');
    if (limit) ordersQuery = ordersQuery.limit(parseInt(limit));
    
    const orders = await ordersQuery;
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get order by ID (for tracking)
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (admin)
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { orderStatus: req.body.status, updatedAt: Date.now() },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
