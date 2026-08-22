const express = require('express');
const Order = require('../models/Order');
const Retailer = require('../models/Retailer');
const { auth } = require('../middleware/auth');
const { hasPermission, requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { notifications } = require('../services/notificationService');
const { requireFeature } = require('../middleware/featureGate');
const logger = require('../services/logger');

const router = express.Router();
router.use(requireFeature('orders'));

// Create order with retailer and GST calculation
router.post('/', auth, requirePermission('order.create'), async (req, res) => {
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

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one order item is required' });
    }

    const invalidItem = items.find(item => !item.name || Number(item.quantity) <= 0 || Number(item.price) < 0);
    if (invalidItem) {
      return res.status(400).json({ message: 'Each item requires a name, positive quantity, and non-negative price' });
    }

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
      const itemTotal = Number(item.price) * Number(item.quantity);
      subtotal += itemTotal;
      return {
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
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
    await recordAuditEvent(req, {
      action: 'order.create',
      entity: 'Order',
      entityId: order._id,
      newValue: { orderNumber: order.orderNumber, amount: order.amount, status: order.status }
    });

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
router.get('/', auth, requirePermission('order.view'), async (req, res) => {
  try {
    const { userId, status, limit } = req.query;
    let query = {};
    
    // Users with order edit permission can see all orders; others only see their own.
    if (hasPermission(req.user, 'order.edit')) {
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
router.get('/:id', auth, requirePermission('order.view'), async (req, res) => {
  try {
    const query = hasPermission(req.user, 'order.edit')
      ? { orderId: req.params.id }
      : { orderId: req.params.id, userId: req.user.id };
    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (admin)
router.put('/:id/status', auth, requirePermission('order.edit'), async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { orderStatus: req.body.status, status: req.body.status, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await recordAuditEvent(req, {
      action: 'order.status.update',
      entity: 'Order',
      entityId: order._id,
      newValue: { orderStatus: order.orderStatus, status: order.status }
    });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
