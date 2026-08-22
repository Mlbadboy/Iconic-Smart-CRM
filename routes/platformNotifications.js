const express = require('express');
const PlatformNotification = require('../models/PlatformNotification');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');
const logger = require('../services/logger');

const router = express.Router();

const isSuperAdmin = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'super-admin' || role === 'superadmin';
};

const superAdminOnly = (req, res, next) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Super Administrator platform access required' });
  }
  next();
};

// ==========================================
// 1. SUPER ADMIN NOTIFICATION MANAGEMENT
// ==========================================

// List all platform notifications
router.get('/platform', auth, superAdminOnly, async (req, res) => {
  try {
    const notifications = await PlatformNotification.find({})
      .sort({ createdAt: -1 })
      .populate('targetCompanies', 'name code subdomain')
      .populate('createdBy', 'name email')
      .lean();

    res.json(notifications);
  } catch (err) {
    logger.error('Error fetching platform notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create and publish a notification
router.post('/platform', auth, superAdminOnly, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      audience,
      targetCompanies,
      targetPlans,
      startTime,
      endTime,
      actionUrl,
      status
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const notification = new PlatformNotification({
      title: title.trim(),
      message: message.trim(),
      type: type || 'GENERAL',
      priority: priority || 'MEDIUM',
      audience: audience || 'ALL_COMPANIES',
      targetCompanies: Array.isArray(targetCompanies) ? targetCompanies : [],
      targetPlans: Array.isArray(targetPlans) ? targetPlans : [],
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null,
      actionUrl: actionUrl?.trim() || null,
      status: status || 'PUBLISHED',
      createdBy: req.user.id
    });

    await notification.save();

    await recordAuditEvent(req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'notification.publish',
      entity: 'PlatformNotification',
      entityId: notification._id,
      newValue: { title: notification.title, type: notification.type, audience: notification.audience }
    });

    res.status(201).json({
      message: 'Platform announcement published successfully',
      notification
    });
  } catch (err) {
    logger.error('Error creating platform notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// Archive a notification
router.patch('/platform/:id/archive', auth, superAdminOnly, async (req, res) => {
  try {
    const notification = await PlatformNotification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.status = 'ARCHIVED';
    await notification.save();

    res.json({ message: 'Notification archived successfully', notification });
  } catch (err) {
    logger.error('Error archiving notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a notification
router.delete('/platform/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const notification = await PlatformNotification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    logger.error('Error deleting notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. TENANT-FACING NOTIFICATIONS
// ==========================================

// Get active notifications for authenticated tenant user
router.get('/tenant', auth, async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    let companyPlan = 'STARTER';
    if (companyId) {
      const comp = await Company.findById(companyId).select('billing').lean();
      if (comp?.billing?.plan) companyPlan = comp.billing.plan;
    }

    // Build audience filter
    const audienceConditions = [
      { audience: 'ALL_COMPANIES' }
    ];

    if (companyId) {
      audienceConditions.push({ audience: 'SELECTED_COMPANIES', targetCompanies: companyId });
      audienceConditions.push({ audience: 'SELECTED_PLAN', targetPlans: companyPlan });
    }

    const query = {
      status: 'PUBLISHED',
      startTime: { $lte: now },
      $or: audienceConditions,
      $and: [
        {
          $or: [
            { endTime: null },
            { endTime: { $gte: now } }
          ]
        }
      ]
    };

    const notifications = await PlatformNotification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(20)
      .lean();

    const enriched = notifications.map(n => {
      const isRead = n.readBy?.some(r => String(r.userId) === String(userId));
      return {
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        startTime: n.startTime,
        endTime: n.endTime,
        actionUrl: n.actionUrl,
        createdAt: n.createdAt,
        isRead: Boolean(isRead)
      };
    });

    const unreadCount = enriched.filter(n => !n.isRead).length;

    // Check for active maintenance banners
    const activeMaintenance = enriched.find(n => n.type === 'SYSTEM_MAINTENANCE' || n.type === 'DOWNTIME');

    res.json({
      notifications: enriched,
      unreadCount,
      activeMaintenance: activeMaintenance || null
    });
  } catch (err) {
    logger.error('Error fetching tenant notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read by current user
router.post('/tenant/:id/read', auth, async (req, res) => {
  try {
    const notification = await PlatformNotification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const userId = req.user.id;
    const companyId = req.user.companyId || null;

    const alreadyRead = notification.readBy.some(r => String(r.userId) === String(userId));
    if (!alreadyRead) {
      notification.readBy.push({ userId, companyId, readAt: new Date() });
      await notification.save();
    }

    res.json({ message: 'Marked as read', id: notification._id });
  } catch (err) {
    logger.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
