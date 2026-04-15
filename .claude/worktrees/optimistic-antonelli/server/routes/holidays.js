const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');
const { protect, requireRole } = require('../middleware/auth');

// @GET /api/holidays
router.get('/', protect, async (req, res) => {
    try {
        const { year } = req.query;
        let filter = {};
        if (year) {
            filter.date = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };
        }
        const holidays = await Holiday.find(filter).sort({ date: 1 });
        res.json({ success: true, count: holidays.length, holidays });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @POST /api/holidays - Admin
router.post('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const holiday = await Holiday.create(req.body);
        res.status(201).json({ success: true, holiday });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/holidays/:id - Admin
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });
        res.json({ success: true, holiday });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @DELETE /api/holidays/:id - Admin
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        await Holiday.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Holiday deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
