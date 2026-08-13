const express = require('express');
const router = express.Router();
const ContentManager = require('../models/ContentManager');
const { auth } = require('../middleware/auth');

// Get all content managers
router.get('/', auth, async (req, res) => {
    try {
        const managers = await ContentManager.find()
            .populate('assignedRequests')
            .sort({ createdAt: -1 });
        res.json(managers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get active content managers
router.get('/active', auth, async (req, res) => {
    try {
        const managers = await ContentManager.find({ active: true })
            .populate('assignedRequests')
            .sort({ pendingCount: 1 }); // Sort by least pending first
        res.json(managers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get content manager by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const manager = await ContentManager.findById(req.params.id)
            .populate('assignedRequests');
        
        if (!manager) {
            return res.status(404).json({ message: 'Content manager not found' });
        }

        res.json(manager);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new content manager
router.post('/', auth, async (req, res) => {
    try {
        const manager = new ContentManager(req.body);
        await manager.save();

        console.log('👨‍💼 Content Manager Assigned:', manager.name);
        console.log('   Email:', manager.email);
        console.log('   Responsibilities:', manager.responsibilities);

        res.status(201).json(manager);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update content manager
router.put('/:id', auth, async (req, res) => {
    try {
        const manager = await ContentManager.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!manager) {
            return res.status(404).json({ message: 'Content manager not found' });
        }

        res.json(manager);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Deactivate content manager
router.delete('/:id', auth, async (req, res) => {
    try {
        const manager = await ContentManager.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );

        if (!manager) {
            return res.status(404).json({ message: 'Content manager not found' });
        }

        res.json({ message: 'Content manager deactivated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get manager statistics
router.get('/:id/stats', auth, async (req, res) => {
    try {
        const manager = await ContentManager.findById(req.params.id);
        
        if (!manager) {
            return res.status(404).json({ message: 'Content manager not found' });
        }

        res.json({
            name: manager.name,
            email: manager.email,
            totalAssigned: manager.assignedRequests.length,
            pending: manager.pendingCount,
            completed: manager.completedCount,
            active: manager.active
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
