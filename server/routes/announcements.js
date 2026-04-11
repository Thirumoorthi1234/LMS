const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/announcements - all authenticated users
router.get('/', protect, async (req, res) => {
    try {
        const { type, pinned, audience } = req.query;
        const filter = { isActive: true };
        if (type) filter.type = type;
        if (pinned !== undefined) filter.pinned = pinned === 'true';
        // audience filter: employees see 'all' and 'employee'; HR sees 'all' and 'hr'
        if (req.user.role === 'employee') {
            filter.$or = [{ audience: 'all' }, { audience: 'employee' }];
        } else if (audience) {
            filter.audience = audience;
        }
        const announcements = await Announcement.find(filter)
            .populate('postedBy', 'name role')
            .sort({ pinned: -1, createdAt: -1 });
        res.json({ success: true, count: announcements.length, announcements });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/announcements - admin/hr only
router.post('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const announcement = await Announcement.create({ ...req.body, postedBy: req.user._id });
        res.status(201).json({ success: true, announcement });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/announcements/:id
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('postedBy', 'name role');
        if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
        res.json({ success: true, announcement });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/announcements/:id (soft delete)
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
