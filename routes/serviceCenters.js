const express = require('express');
const router = express.Router();
const ServiceCenter = require('../models/ServiceCenter');
const { auth } = require('../middleware/auth');

// Get all service centers
router.get('/', auth, async (req, res) => {
    try {
        const centers = await ServiceCenter.find().sort({ createdAt: -1 });
        res.json(centers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get active service centers
router.get('/active', auth, async (req, res) => {
    try {
        const centers = await ServiceCenter.find({ active: true }).sort({ name: 1 });
        res.json(centers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new service center
router.post('/', auth, async (req, res) => {
    try {
        const center = new ServiceCenter(req.body);
        await center.save();
        res.status(201).json(center);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update service center
router.put('/:id', auth, async (req, res) => {
    try {
        const center = await ServiceCenter.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!center) {
            return res.status(404).json({ message: 'Service center not found' });
        }
        res.json(center);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete service center (soft delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        const center = await ServiceCenter.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );
        if (!center) {
            return res.status(404).json({ message: 'Service center not found' });
        }
        res.json({ message: 'Service center deactivated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
