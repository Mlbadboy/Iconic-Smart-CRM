const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const { auth } = require('../middleware/auth');
const { hasPermission, requirePermission } = require('../middleware/rbac');
const { requireFeature } = require('../middleware/featureGate');
const { recordAuditEvent } = require('../services/auditService');
const { sendEmail, emailTemplates } = require('../services/emailService');
const logger = require('../services/logger');

router.use(requireFeature('service'));

const allowedStatusTransitions = {
    open: ['in-progress', 'closed'],
    'in-progress': ['resolved', 'open'],
    resolved: ['closed', 'in-progress'],
    closed: []
};

function canManageServiceRequest(user, request) {
    return hasPermission(user, 'service.assign') || String(request.userId?._id || request.userId || '') === user.id;
}

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
router.get('/', auth, requirePermission('service.view'), async (req, res) => {
    try {
        const query = hasPermission(req.user, 'service.assign') ? {} : { userId: req.user.id };
        const requests = await ServiceRequest.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get service requests by status
router.get('/status/:status', auth, requirePermission('service.view'), async (req, res) => {
    try {
        const query = { status: req.params.status };
        if (!hasPermission(req.user, 'service.assign')) query.userId = req.user.id;
        const requests = await ServiceRequest.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get service requests by service center
router.get('/center/:centerId', auth, requirePermission('service.view'), async (req, res) => {
    try {
        const query = { serviceCenterId: req.params.centerId };
        if (!hasPermission(req.user, 'service.assign')) query.userId = req.user.id;
        const requests = await ServiceRequest.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get service requests by serial number
router.get('/serial/:serialNumber', auth, requirePermission('service.view'), async (req, res) => {
    try {
        const query = { serialNumber: req.params.serialNumber };
        if (!hasPermission(req.user, 'service.assign')) query.userId = req.user.id;
        const requests = await ServiceRequest.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new service request
router.post('/', auth, requirePermission('service.create'), async (req, res) => {
    try {
        // Create service request
        const request = new ServiceRequest({
            ...req.body,
            userId: req.user.id
        });
        
        await request.save();
        await recordAuditEvent(req, {
            action: 'service.create',
            entity: 'ServiceRequest',
            entityId: request._id,
            newValue: { serviceId: request.serviceId, status: request.status, priority: request.priority }
        });

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
router.put('/:id', auth, requirePermission('service.edit'), async (req, res) => {
    try {
        const existing = await ServiceRequest.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Service request not found' });
        }
        if (!canManageServiceRequest(req.user, existing)) {
            return res.status(403).json({ message: 'Not authorized to update this service request' });
        }
        if (existing.status === 'closed') {
            return res.status(409).json({ message: 'Closed service requests cannot be edited' });
        }
        const updates = { ...req.body };
        delete updates.userId;
        delete updates.serviceId;
        const request = await ServiceRequest.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );
        
        await recordAuditEvent(req, {
            action: 'service.update',
            entity: 'ServiceRequest',
            entityId: request._id,
            previousValue: { status: existing.status, priority: existing.priority, assignedTo: existing.assignedTo },
            newValue: { status: request.status, priority: request.priority, assignedTo: request.assignedTo }
        });
        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update service request status
router.patch('/:id/status', auth, requirePermission('service.edit'), async (req, res) => {
    try {
        const { status } = req.body;
        const request = await ServiceRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ message: 'Service request not found' });
        }
        if (!canManageServiceRequest(req.user, request)) {
            return res.status(403).json({ message: 'Not authorized to update this service request' });
        }
        const validNextStatuses = allowedStatusTransitions[request.status] || [];
        if (!validNextStatuses.includes(status)) {
            return res.status(409).json({ message: `Invalid status transition from ${request.status} to ${status}` });
        }
        const previousStatus = request.status;
        request.status = status;
        await request.save();
        await recordAuditEvent(req, {
            action: 'service.status.update',
            entity: 'ServiceRequest',
            entityId: request._id,
            previousValue: { status: previousStatus },
            newValue: { status: request.status }
        });
        
        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get statistics
router.get('/stats/summary', auth, requirePermission('service.view'), async (req, res) => {
    try {
        const query = hasPermission(req.user, 'service.assign') ? {} : { userId: req.user.id };
        const total = await ServiceRequest.countDocuments(query);
        const open = await ServiceRequest.countDocuments({ ...query, status: 'open' });
        const inProgress = await ServiceRequest.countDocuments({ ...query, status: 'in-progress' });
        const resolved = await ServiceRequest.countDocuments({ ...query, status: 'resolved' });
        const closed = await ServiceRequest.countDocuments({ ...query, status: 'closed' });

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
