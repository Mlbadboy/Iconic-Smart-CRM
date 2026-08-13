const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { hasPermission, requirePermission } = require('../middleware/rbac');
const { recordAuditEvent } = require('../services/auditService');
const User = require('../models/User');

// Get all users (Admin only)
router.get('/', auth, requirePermission('user.view'), async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        
        res.json(users);
        console.log('👥 Users list retrieved:', users.length, 'users');
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID (Admin only)
router.get('/:id', auth, requirePermission('user.view'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete user (Admin only, cannot delete self)
router.delete('/:id', auth, requirePermission('user.disable'), async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Prevent deleting other admin users (optional protection)
        if (hasPermission(user, 'role.manage')) {
            return res.status(400).json({ message: 'Cannot delete administrator users' });
        }
        
        await User.findByIdAndDelete(userId);
        await recordAuditEvent(req, {
            action: 'user.delete',
            entity: 'User',
            entityId: user._id,
            previousValue: { name: user.name, email: user.email, role: user.role }
        });
        
        res.json({ message: 'User deleted successfully', deletedUser: user.name });
        console.log('🗑️ User deleted:', user.name, user.email);
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update user (Admin only)
router.put('/:id', auth, requirePermission('user.edit'), async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        
        // Don't allow password updates through this route
        delete updates.password;
        
        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await recordAuditEvent(req, {
            action: 'user.update',
            entity: 'User',
            entityId: user._id,
            newValue: user.toObject ? user.toObject() : user
        });
        
        res.json(user);
        console.log('✏️ User updated:', user.name);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
