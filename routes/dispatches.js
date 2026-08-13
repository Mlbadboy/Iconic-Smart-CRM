const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const LogisticPartner = require('../models/LogisticPartner');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');
const { trackShipment, updateDispatchFromTracking } = require('../services/trackingService');
const logger = require('../services/logger');

// Get all dispatches
router.get('/', auth, async (req, res) => {
    try {
        const dispatches = await Dispatch.find()
            .populate('orderId')
            .populate('logisticPartnerId')
            .populate('dispatchedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(dispatches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get dispatches by status
router.get('/status/:status', auth, async (req, res) => {
    try {
        const dispatches = await Dispatch.find({ status: req.params.status })
            .populate('orderId')
            .populate('logisticPartnerId')
            .sort({ createdAt: -1 });
        res.json(dispatches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get dispatches by tracking ID
router.get('/track/:trackingId', async (req, res) => {
    try {
        const dispatch = await Dispatch.findOne({ trackingId: req.params.trackingId })
            .populate('logisticPartnerId');
        
        if (!dispatch) {
            return res.status(404).json({ message: 'Tracking ID not found' });
        }

        res.json(dispatch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get pending orders (not dispatched yet)
router.get('/pending-orders', auth, async (req, res) => {
    try {
        // Find orders that are not yet dispatched
        const dispatchedOrderIds = await Dispatch.distinct('orderId');
        const pendingOrders = await Order.find({
            _id: { $nin: dispatchedOrderIds },
            status: { $in: ['confirmed', 'processing', 'ready-to-ship'] }
        }).sort({ createdAt: -1 });

        res.json(pendingOrders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new dispatch
router.post('/', auth, async (req, res) => {
    try {
        // Check if order is already dispatched
        const existingDispatch = await Dispatch.findOne({ orderId: req.body.orderId });
        if (existingDispatch) {
            return res.status(400).json({ message: 'Order already dispatched' });
        }

        // Get order details
        const order = await Order.findById(req.body.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Get logistic partner details
        const partner = await LogisticPartner.findById(req.body.logisticPartnerId);
        if (!partner) {
            return res.status(404).json({ message: 'Logistic partner not found' });
        }

        // Create dispatch
        const dispatch = new Dispatch({
            ...req.body,
            orderNumber: order.orderNumber || order._id,
            logisticPartnerName: partner.partnerName,
            trackingUrl: `${partner.trackingUrl}${req.body.trackingId}`,
            customerName: order.customer?.name || req.body.customerName,
            customerPhone: order.customer?.phone || req.body.customerPhone,
            deliveryAddress: order.deliveryAddress || req.body.deliveryAddress,
            productDetails: order.items?.map(i => i.name).join(', ') || req.body.productDetails,
            dispatchedBy: req.user.id,
            dispatchedByName: req.user.name,
            visibleInApp: true
        });

        await dispatch.save();

        // Update order status
        order.status = 'dispatched';
        order.dispatchDate = new Date();
        await order.save();

        // Update partner statistics
        partner.totalDeliveries += 1;
        partner.activeDeliveries += 1;
        await partner.save();

        console.log('📦 Dispatch Created:', dispatch.dispatchId);
        console.log('   Order:', dispatch.orderNumber);
        console.log('   Partner:', dispatch.logisticPartnerName);
        console.log('   AWB:', dispatch.awbNumber);
        console.log('   Tracking:', dispatch.trackingId);
        console.log('   ✅ Visible in Android App');

        res.status(201).json(dispatch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update dispatch
router.put('/:id', auth, async (req, res) => {
    try {
        const oldDispatch = await Dispatch.findById(req.params.id);
        const dispatch = await Dispatch.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!dispatch) {
            return res.status(404).json({ message: 'Dispatch not found' });
        }

        // Update partner statistics if status changed to delivered
        if (oldDispatch.status !== 'delivered' && dispatch.status === 'delivered') {
            const partner = await LogisticPartner.findById(dispatch.logisticPartnerId);
            if (partner) {
                partner.activeDeliveries = Math.max(0, partner.activeDeliveries - 1);
                await partner.save();
            }

            // Update order status
            await Order.findByIdAndUpdate(dispatch.orderId, {
                status: 'delivered',
                deliveryDate: new Date()
            });

            dispatch.actualDeliveryDate = new Date();
            await dispatch.save();
        }

        res.json(dispatch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update dispatch status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        const dispatch = await Dispatch.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                actualDeliveryDate: status === 'delivered' ? new Date() : undefined
            },
            { new: true }
        );

        if (!dispatch) {
            return res.status(404).json({ message: 'Dispatch not found' });
        }

        // Update partner statistics
        if (status === 'delivered') {
            const partner = await LogisticPartner.findById(dispatch.logisticPartnerId);
            if (partner) {
                partner.activeDeliveries = Math.max(0, partner.activeDeliveries - 1);
                await partner.save();
            }

            // Update order status
            await Order.findByIdAndUpdate(dispatch.orderId, {
                status: 'delivered',
                deliveryDate: new Date()
            });
        }

        res.json(dispatch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const total = await Dispatch.countDocuments();
        const dispatched = await Dispatch.countDocuments({ status: 'dispatched' });
        const inTransit = await Dispatch.countDocuments({ status: 'in-transit' });
        const outForDelivery = await Dispatch.countDocuments({ status: 'out-for-delivery' });
        const delivered = await Dispatch.countDocuments({ status: 'delivered' });
        const failed = await Dispatch.countDocuments({ status: 'failed' });

        res.json({
            total,
            dispatched,
            inTransit,
            outForDelivery,
            delivered,
            failed,
            active: dispatched + inTransit + outForDelivery
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Track shipment using partner API
router.get('/:id/track', auth, async (req, res) => {
    try {
        const dispatch = await Dispatch.findById(req.params.id)
            .populate('logisticPartnerId');
        
        if (!dispatch) {
            return res.status(404).json({ message: 'Dispatch not found' });
        }

        const partner = dispatch.logisticPartnerId;
        if (!partner) {
            return res.status(404).json({ message: 'Logistic partner not found' });
        }

        // Track using API if enabled
        if (partner.apiIntegration?.enabled) {
            const trackingData = await trackShipment(dispatch.awbNumber, partner);
            
            if (trackingData.success) {
                // Update dispatch status if changed
                const updateResult = await updateDispatchFromTracking(dispatch, partner);
                if (updateResult.updated) {
                    dispatch.status = updateResult.status;
                    if (updateResult.location) {
                        dispatch.notes = `Last location: ${updateResult.location}`;
                    }
                    if (updateResult.estimatedDelivery) {
                        dispatch.estimatedDeliveryDate = new Date(updateResult.estimatedDelivery);
                    }
                    await dispatch.save();
                }
            }

            return res.json({
                dispatch: dispatch,
                tracking: trackingData
            });
        } else {
            // Return basic tracking info
            return res.json({
                dispatch: dispatch,
                tracking: {
                    success: true,
                    status: dispatch.status,
                    trackingUrl: dispatch.trackingUrl,
                    message: 'API integration not enabled. Use tracking URL for manual tracking.'
                }
            });
        }
    } catch (error) {
        logger.error('Error tracking shipment:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
