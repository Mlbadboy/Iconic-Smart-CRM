const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const { auth } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../services/emailService');
const logger = require('../services/logger');

// Email notification function (real implementation)
async function sendEmailNotification(requestData) {
    try {
        const emailContent = emailTemplates.serviceRequest(requestData);
        
        const result = await sendEmail({
            to: requestData.serviceCenterEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
        });

        if (result.sent) {
            logger.info(`✅ Service request email sent to ${requestData.serviceCenterEmail}`);
        } else {
            logger.warn(`⚠️ Service request email not sent: ${result.reason || result.error}`);
        }

        return result;
    } catch (error) {
        logger.error('Error sending service request email:', error);
    return {
            sent: false,
            error: error.message,
        timestamp: new Date()
    };
    }
}

// Get all service requests
router.get('/', auth, async (req, res) => {
    try {
        const requests = await ServiceRequest.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get service requests by status
router.get('/status/:status', auth, async (req, res) => {
    try {
        const requests = await ServiceRequest.find({ status: req.params.status })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get service requests by service center
router.get('/center/:centerId', auth, async (req, res) => {
    try {
        const requests = await ServiceRequest.find({ serviceCenterId: req.params.centerId })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get service requests by serial number
router.get('/serial/:serialNumber', auth, async (req, res) => {
    try {
        const requests = await ServiceRequest.find({ serialNumber: req.params.serialNumber })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new service request
router.post('/', auth, async (req, res) => {
    try {
        // Create service request
        const request = new ServiceRequest({
            ...req.body,
            userId: req.user.id
        });
        
        await request.save();

        // Send email notification
        try {
            const emailResult = await sendEmailNotification({
                serviceId: request.serviceId,
                serviceCenterEmail: request.serviceCenterEmail,
                serviceType: request.serviceType,
                productType: request.productType,
                serialNumber: request.serialNumber,
                priority: request.priority,
                description: request.description,
                customerName: request.customerName,
                customerPhone: request.customerPhone
            });

            if (emailResult.sent) {
                request.emailSent = true;
                request.emailSentAt = emailResult.timestamp;
                await request.save();
            }
        } catch (emailError) {
            logger.error('Failed to send email:', emailError);
            // Continue even if email fails
        }

        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
            const { notifications } = require('../services/notificationService');
            notifications.serviceRequestCreated(io, req.user.id, request);
        }

        res.status(201).json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update service request
router.put('/:id', auth, async (req, res) => {
    try {
        const request = await ServiceRequest.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!request) {
            return res.status(404).json({ message: 'Service request not found' });
        }
        
        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update service request status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        const request = await ServiceRequest.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!request) {
            return res.status(404).json({ message: 'Service request not found' });
        }
        
        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const total = await ServiceRequest.countDocuments();
        const open = await ServiceRequest.countDocuments({ status: 'open' });
        const inProgress = await ServiceRequest.countDocuments({ status: 'in-progress' });
        const resolved = await ServiceRequest.countDocuments({ status: 'resolved' });
        const closed = await ServiceRequest.countDocuments({ status: 'closed' });

        res.json({
            total,
            open,
            inProgress,
            resolved,
            closed,
            pending: open + inProgress
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
