const express = require('express');
const Service = require('../models/Service');
const { auth } = require('../middleware/auth');
const { hasPermission, requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const { assertTransition } = require('../services/workflowService');

const router = express.Router();

router.post('/', auth, requirePermission('service.create'), async (req, res) => {
  try {
    const { issueType, description, orderRef, priority } = req.body;
    const service = new Service({
      serviceId: 'SRV-' + Date.now(),
      userId: req.user.id,
      issueType,
      description,
      orderRef,
      priority
    });
    await service.save();
    await recordAuditEvent(req, { action: 'service.legacy.create', entity: 'Service', entityId: service._id, newValue: service.toObject() });
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', auth, requirePermission('service.view'), async (req, res) => {
  try {
    const { userId, status, priority, limit } = req.query;
    const query = {};
    if (hasPermission(req.user, 'service.assign')) {
      if (userId) query.userId = userId;
    } else {
      query.userId = req.user.id;
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;
    let servicesQuery = Service.find(query).populate('userId', 'name email').sort({ createdAt: -1 });
    servicesQuery = servicesQuery.limit(Math.min(parseInt(limit, 10) || 25, 100));
    const services = await servicesQuery;
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, requirePermission('service.view'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('userId', 'name email');
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (!hasPermission(req.user, 'service.assign') && service.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', auth, requirePermission('service.edit'), async (req, res) => {
  try {
    const service = await Service.findOne({ serviceId: req.params.id });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (!hasPermission(req.user, 'service.assign') && String(service.userId) !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const previousStatus = service.status;
    assertTransition('service', previousStatus, req.body.status);
    service.status = req.body.status;
    service.assignedTo = req.body.assignedTo || service.assignedTo;
    service.updatedAt = Date.now();
    await service.save();
    await recordAuditEvent(req, { action: 'service.legacy.status.update', entity: 'Service', entityId: service._id, previousValue: { status: previousStatus }, newValue: { status: service.status, assignedTo: service.assignedTo } });
    res.json(service);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message, code: err.code });
  }
});

module.exports = router;
