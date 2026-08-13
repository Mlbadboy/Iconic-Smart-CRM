const express = require('express');
const Delivery = require('../models/Delivery');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create delivery
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const { orderRef, courier, eta } = req.body;
    const deliveryId = 'DEL-' + Date.now();
    const delivery = new Delivery({ deliveryId, orderRef, courier, eta });
    await delivery.save();
    res.status(201).json(delivery);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get deliveries for order
router.get('/:orderRef', auth, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ orderRef: req.params.orderRef });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update delivery status
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const delivery = await Delivery.findOneAndUpdate(
      { deliveryId: req.params.id },
      { currentStatus: req.body.status, eta: req.body.eta, updatedAt: Date.now() },
      { new: true }
    );
    delivery.history.push({ status: req.body.status, timestamp: Date.now() });
    await delivery.save();
    res.json(delivery);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
