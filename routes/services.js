const express = require('express');
const Service = require('../models/Service');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create service request
router.post('/', auth, async (req, res) => {
  try {
    const { issueType, description, orderRef, priority } = req.body;
    const serviceId = 'SRV-' + Date.now();
    const service = new Service({ 
      serviceId, 
      userId: req.user.id, 
      issueType, 
      description, 
      orderRef,
      priority 
    });
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get services (with filtering)
router.get('/', auth, async (req, res) => {
  try {
    const { userId, status, priority, limit } = req.query;
    let query = {};
    
    // Admins can see all services, users only see their own
    if (req.user.role === 'admin') {
      if (userId) query.userId = userId;
      if (status) query.status = status;
      if (priority) query.priority = priority;
    } else {
      query.userId = req.user.id;
      if (status) query.status = status;
      if (priority) query.priority = priority;
    }
    
    let servicesQuery = Service.find(query).populate('userId', 'name email');
    if (limit) servicesQuery = servicesQuery.limit(parseInt(limit));
    
    const services = await servicesQuery;
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get service by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('userId', 'name email');
    if (!service) return res.status(404).json({ message: 'Service not found' });
    
    // Users can only see their own services, admins can see all
    if (req.user.role !== 'admin' && service.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update service status (admin)
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  try {
    const service = await Service.findOneAndUpdate(
      { serviceId: req.params.id },
      { status: req.body.status, assignedTo: req.body.assignedTo, updatedAt: Date.now() },
      { new: true }
    );
    res.json(service);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
