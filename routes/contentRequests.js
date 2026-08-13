const express = require('express');
const router = express.Router();
const ContentRequest = require('../models/ContentRequest');
const ContentManager = require('../models/ContentManager');
const { auth } = require('../middleware/auth');

// Email notification function
async function notifyContentManager(requestData, managerEmail) {
    console.log('📧 Content Request Notification:');
    console.log('To:', managerEmail);
    console.log('Subject: New Content Request -', requestData.requestId);
    console.log('---');
    console.log('Request ID:', requestData.requestId);
    console.log('Festival:', requestData.festivalName);
    console.log('Date:', requestData.festivalDate);
    console.log('Type:', requestData.contentType);
    console.log('Priority:', requestData.priority);
    console.log('Description:', requestData.description);
    console.log('---');
    
    return { sent: true, timestamp: new Date() };
}

// Get all content requests
router.get('/', auth, async (req, res) => {
    try {
        const requests = await ContentRequest.find()
            .populate('userId', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get requests by status
router.get('/status/:status', auth, async (req, res) => {
    try {
        const requests = await ContentRequest.find({ status: req.params.status })
            .populate('userId', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get requests by festival
router.get('/festival/:name', auth, async (req, res) => {
    try {
        const requests = await ContentRequest.find({ festivalName: req.params.name })
            .populate('userId', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ festivalDate: 1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new content request
router.post('/', auth, async (req, res) => {
    try {
        const request = new ContentRequest({
            ...req.body,
            userId: req.user.id
        });

        await request.save();

        // Auto-assign to an available content manager
        try {
            const manager = await ContentManager.findOne({ active: true }).sort({ pendingCount: 1 });
            
            if (manager) {
                request.assignedTo = manager._id;
                request.assignedToName = manager.name;
                request.status = 'assigned';
                manager.assignedRequests.push(request._id);
                manager.pendingCount += 1;
                
                await Promise.all([request.save(), manager.save()]);

                // Send notification
                await notifyContentManager({
                    requestId: request.requestId,
                    festivalName: request.festivalName,
                    festivalDate: request.festivalDate,
                    contentType: request.contentType,
                    priority: request.priority,
                    description: request.description
                }, manager.email);
            }
        } catch (assignError) {
            console.error('Failed to auto-assign:', assignError);
        }

        res.status(201).json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update content request
router.put('/:id', auth, async (req, res) => {
    try {
        const oldRequest = await ContentRequest.findById(req.params.id);
        const request = await ContentRequest.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!request) {
            return res.status(404).json({ message: 'Content request not found' });
        }

        // Update manager counts if status changed
        if (oldRequest.status !== request.status && request.assignedTo) {
            const manager = await ContentManager.findById(request.assignedTo);
            if (manager) {
                if (request.status === 'completed') {
                    manager.completedCount += 1;
                    manager.pendingCount = Math.max(0, manager.pendingCount - 1);
                }
                await manager.save();
            }
        }

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update request status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        const request = await ContentRequest.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                completedAt: status === 'completed' ? new Date() : undefined
            },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({ message: 'Content request not found' });
        }

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const total = await ContentRequest.countDocuments();
        const pending = await ContentRequest.countDocuments({ status: 'pending' });
        const assigned = await ContentRequest.countDocuments({ status: 'assigned' });
        const inProgress = await ContentRequest.countDocuments({ status: 'in-progress' });
        const completed = await ContentRequest.countDocuments({ status: 'completed' });
        const rejected = await ContentRequest.countDocuments({ status: 'rejected' });

        res.json({
            total,
            pending,
            assigned,
            inProgress,
            completed,
            rejected,
            active: pending + assigned + inProgress
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
