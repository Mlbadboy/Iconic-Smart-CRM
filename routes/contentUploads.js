const express = require('express');
const router = express.Router();
const ContentUpload = require('../models/ContentUpload');
const { auth } = require('../middleware/auth');

// Get all content uploads
router.get('/', auth, async (req, res) => {
    try {
        const uploads = await ContentUpload.find({ visibleInApp: true })
            .populate('userId', 'name email')
            .sort({ publishedAt: -1 });
        res.json(uploads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get uploads by type
router.get('/type/:type', auth, async (req, res) => {
    try {
        const uploads = await ContentUpload.find({ 
            mediaType: req.params.type,
            visibleInApp: true 
        })
            .populate('userId', 'name email')
            .sort({ publishedAt: -1 });
        res.json(uploads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get uploads by audience
router.get('/audience/:audience', auth, async (req, res) => {
    try {
        const uploads = await ContentUpload.find({ 
            targetAudience: req.params.audience,
            visibleInApp: true 
        })
            .populate('userId', 'name email')
            .sort({ publishedAt: -1 });
        res.json(uploads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new content upload
router.post('/', auth, async (req, res) => {
    try {
        const upload = new ContentUpload({
            ...req.body,
            userId: req.user.id,
            publishedAt: new Date()
        });

        await upload.save();

        // In production, this would also upload files to cloud storage (S3, Cloudinary, etc.)
        console.log('📤 Content Upload Created:', upload.uploadId);
        console.log('   Title:', upload.title);
        console.log('   Type:', upload.mediaType);
        console.log('   Files:', upload.fileCount);
        console.log('   Visible in Android App: YES');

        res.status(201).json(upload);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update content upload
router.put('/:id', auth, async (req, res) => {
    try {
        const upload = await ContentUpload.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!upload) {
            return res.status(404).json({ message: 'Content upload not found' });
        }

        res.json(upload);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Toggle visibility in app
router.patch('/:id/visibility', auth, async (req, res) => {
    try {
        const { visibleInApp } = req.body;
        
        const upload = await ContentUpload.findByIdAndUpdate(
            req.params.id,
            { visibleInApp },
            { new: true }
        );

        if (!upload) {
            return res.status(404).json({ message: 'Content upload not found' });
        }

        res.json(upload);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
    try {
        const upload = await ContentUpload.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewCount: 1 } },
            { new: true }
        );

        if (!upload) {
            return res.status(404).json({ message: 'Content upload not found' });
        }

        res.json({ viewCount: upload.viewCount });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete content upload
router.delete('/:id', auth, async (req, res) => {
    try {
        const upload = await ContentUpload.findByIdAndUpdate(
            req.params.id,
            { visibleInApp: false },
            { new: true }
        );

        if (!upload) {
            return res.status(404).json({ message: 'Content upload not found' });
        }

        res.json({ message: 'Content hidden from app' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const total = await ContentUpload.countDocuments();
        const images = await ContentUpload.countDocuments({ mediaType: 'image', visibleInApp: true });
        const videos = await ContentUpload.countDocuments({ mediaType: 'video', visibleInApp: true });
        const published = await ContentUpload.countDocuments({ status: 'published' });
        
        const totalViews = await ContentUpload.aggregate([
            { $match: { visibleInApp: true } },
            { $group: { _id: null, total: { $sum: '$viewCount' } } }
        ]);

        res.json({
            total,
            images,
            videos,
            published,
            totalViews: totalViews[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
