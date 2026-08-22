const express = require('express');
const Delivery = require('../models/Delivery');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const { assertTransition } = require('../services/workflowService');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();
router.use(requireFeature('logistics'));

router.post('/', auth, requirePermission('operations.edit'), async (req, res) => {
  try {
    const { orderRef, courier, eta } = req.body;
    const delivery = new Delivery({ deliveryId: 'DEL-' + Date.now(), orderRef, courier, eta });
    await delivery.save();
    await recordAuditEvent(req, { action: 'delivery.create', entity: 'Delivery', entityId: delivery._id, newValue: delivery.toObject() });
    res.status(201).json(delivery);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:orderRef', auth, requirePermission('operations.view'), async (req, res) => {
  try {
    const deliveries = await Delivery.find({ orderRef: req.params.orderRef });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', auth, requirePermission('operations.edit'), async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ deliveryId: req.params.id });
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    const previousStatus = delivery.currentStatus;
    assertTransition('delivery', previousStatus, req.body.status);
    delivery.currentStatus = req.body.status;
    delivery.eta = req.body.eta || delivery.eta;
    delivery.updatedAt = Date.now();
    delivery.history.push({ status: req.body.status, timestamp: Date.now() });
    await delivery.save();
    await recordAuditEvent(req, { action: 'delivery.status.update', entity: 'Delivery', entityId: delivery._id, previousValue: { status: previousStatus }, newValue: { status: delivery.currentStatus } });
    res.json(delivery);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message, code: err.code });
  }
});

module.exports = router;
