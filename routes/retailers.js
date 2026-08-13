const express = require('express');
const router = express.Router();
const Retailer = require('../models/Retailer');
const { auth } = require('../middleware/auth');

// Get all retailers
router.get('/', auth, async (req, res) => {
    try {
        const retailers = await Retailer.find({ active: true })
            .sort({ retailerName: 1 });
        res.json(retailers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get retailer by ID with full details
router.get('/:id', auth, async (req, res) => {
    try {
        const retailer = await Retailer.findById(req.params.id)
            .populate('orderHistory.orderId');
        
        if (!retailer) {
            return res.status(404).json({ message: 'Retailer not found' });
        }
        
        res.json(retailer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new retailer
router.post('/', auth, async (req, res) => {
    try {
        const retailer = new Retailer(req.body);
        await retailer.save();
        
        console.log('✅ Retailer Created:', retailer.retailerName);
        res.status(201).json(retailer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update retailer
router.put('/:id', auth, async (req, res) => {
    try {
        const retailer = await Retailer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!retailer) {
            return res.status(404).json({ message: 'Retailer not found' });
        }
        
        res.json(retailer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete/deactivate retailer
router.delete('/:id', auth, async (req, res) => {
    try {
        const retailer = await Retailer.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );
        
        if (!retailer) {
            return res.status(404).json({ message: 'Retailer not found' });
        }
        
        res.json({ message: 'Retailer deactivated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
