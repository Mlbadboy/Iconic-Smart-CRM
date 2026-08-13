const express = require('express');
const router = express.Router();
const LogisticPartner = require('../models/LogisticPartner');
const { auth } = require('../middleware/auth');

// Get all logistic partners
router.get('/', auth, async (req, res) => {
    try {
        const partners = await LogisticPartner.find().sort({ partnerName: 1 });
        res.json(partners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get active logistic partners
router.get('/active', auth, async (req, res) => {
    try {
        const partners = await LogisticPartner.find({ active: true }).sort({ partnerName: 1 });
        res.json(partners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get partner by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const partner = await LogisticPartner.findById(req.params.id);
        if (!partner) {
            return res.status(404).json({ message: 'Logistic partner not found' });
        }
        res.json(partner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new logistic partner
router.post('/', auth, async (req, res) => {
    try {
        const partner = new LogisticPartner(req.body);
        await partner.save();

        console.log('🚚 Logistic Partner Onboarded:', partner.partnerName);
        console.log('   Code:', partner.partnerCode);
        console.log('   Contact:', partner.contactPerson);

        res.status(201).json(partner);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update logistic partner
router.put('/:id', auth, async (req, res) => {
    try {
        const partner = await LogisticPartner.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!partner) {
            return res.status(404).json({ message: 'Logistic partner not found' });
        }

        res.json(partner);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Deactivate logistic partner
router.delete('/:id', auth, async (req, res) => {
    try {
        const partner = await LogisticPartner.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );

        if (!partner) {
            return res.status(404).json({ message: 'Logistic partner not found' });
        }

        res.json({ message: 'Logistic partner deactivated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get partner statistics
router.get('/:id/stats', auth, async (req, res) => {
    try {
        const partner = await LogisticPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ message: 'Logistic partner not found' });
        }

        res.json({
            partnerName: partner.partnerName,
            totalDeliveries: partner.totalDeliveries,
            activeDeliveries: partner.activeDeliveries,
            completedDeliveries: partner.totalDeliveries - partner.activeDeliveries
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
