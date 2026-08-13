const express = require('express');
const crypto = require('crypto');
const Webhook = require('../models/Webhook');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create webhook
router.post('/', auth, async (req, res) => {
  try {
    const { name, url, events, headers } = req.body;
    
    // Generate secret for signature verification
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = new Webhook({
      userId: req.user.id,
      name,
      url,
      events,
      secret,
      headers: headers || {}
    });

    await webhook.save();

    res.status(201).json({
      message: 'Webhook created successfully',
      webhook: {
        id: webhook._id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,  // Show secret only once
        active: webhook.active
      },
      info: 'Use this secret to verify webhook signatures'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's webhooks
router.get('/', auth, async (req, res) => {
  try {
    const webhooks = await Webhook.find({ userId: req.user.id })
      .select('-secret')  // Don't return secret
      .sort('-createdAt');
    
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single webhook
router.get('/:id', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    res.json(webhook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update webhook
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, url, events, active, headers } = req.body;
    
    const webhook = await Webhook.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        name, 
        url, 
        events, 
        active,
        headers,
        updatedAt: Date.now() 
      },
      { new: true }
    ).select('-secret');
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    res.json({ message: 'Webhook updated', webhook });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete webhook
router.delete('/:id', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Test webhook (send test event)
router.post('/:id/test', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Send test event
    const testData = {
      event: 'test.event',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook event',
        webhookId: webhook._id
      }
    };

    const WebhookService = require('../services/webhookService');
    const signature = WebhookService.generateSignature(webhook.secret, testData);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'test.event'
      },
      body: JSON.stringify(testData),
      timeout: 10000
    });

    if (response.ok) {
      res.json({ 
        message: 'Test webhook delivered successfully',
        status: response.status,
        statusText: response.statusText
      });
    } else {
      res.status(400).json({ 
        message: 'Test webhook delivery failed',
        status: response.status,
        statusText: response.statusText
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error sending test webhook',
      error: error.message 
    });
  }
});

// Get webhook stats
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    }).select('stats name url');
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    res.json({
      name: webhook.name,
      url: webhook.url,
      statistics: webhook.stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
