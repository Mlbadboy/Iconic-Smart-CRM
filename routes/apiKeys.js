const express = require('express');
const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate API Key
function generateApiKey() {
  return 'ik_' + crypto.randomBytes(32).toString('hex');
}

// Create API Key
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, permissions, expiresInDays, allowedOrigins } = req.body;
    
    const key = generateApiKey();
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = new ApiKey({
      key,
      name,
      description,
      userId: req.user.id,
      permissions: permissions || ['read'],
      expiresAt,
      allowedOrigins: allowedOrigins || []
    });

    await apiKey.save();

    res.status(201).json({
      message: 'API Key created successfully',
      apiKey: {
        id: apiKey._id,
        key: apiKey.key,  // Show key only once on creation
        name: apiKey.name,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      },
      warning: 'Save this API key securely. You won\'t be able to see it again!'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's API keys (without showing the actual keys)
router.get('/', auth, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ userId: req.user.id })
      .select('-key')  // Don't return the actual key
      .sort('-createdAt');
    
    res.json(apiKeys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single API key details
router.get('/:id', auth, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    }).select('-key');
    
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    res.json(apiKey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update API key
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, permissions, active, allowedOrigins } = req.body;
    
    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        name, 
        description, 
        permissions, 
        active,
        allowedOrigins,
        updatedAt: Date.now() 
      },
      { new: true }
    ).select('-key');
    
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    res.json({ message: 'API key updated', apiKey });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Revoke/Delete API key
router.delete('/:id', auth, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rotate API key (generate new key, keep same permissions)
router.post('/:id/rotate', auth, async (req, res) => {
  try {
    const oldKey = await ApiKey.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!oldKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    const newKeyValue = generateApiKey();
    oldKey.key = newKeyValue;
    oldKey.updatedAt = Date.now();
    await oldKey.save();
    
    res.json({
      message: 'API key rotated successfully',
      apiKey: {
        id: oldKey._id,
        key: newKeyValue,  // Show new key only once
        name: oldKey.name
      },
      warning: 'Update your applications with the new API key immediately!'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
