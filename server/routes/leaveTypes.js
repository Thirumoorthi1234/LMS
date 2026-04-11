const express = require('express');
const router = express.Router();
const LeaveType = require('../models/LeaveType');
const { protect, requireRole } = require('../middleware/auth');

// @GET /api/leave-types
router.get('/', protect, async (req, res) => {
    try {
        const leaveTypes = await LeaveType.find({ isActive: true }).sort({ name: 1 });
        res.json({ success: true, leaveTypes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/leave-types/all (admin: include inactive)
router.get('/all', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const leaveTypes = await LeaveType.find().sort({ name: 1 });
        res.json({ success: true, leaveTypes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @POST /api/leave-types - Admin
router.post('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const leaveType = await LeaveType.create(req.body);
        res.status(201).json({ success: true, leaveType });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/leave-types/:id - Admin
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const leaveType = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!leaveType) return res.status(404).json({ success: false, message: 'Leave type not found' });
        res.json({ success: true, leaveType });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @DELETE /api/leave-types/:id - Admin
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        await LeaveType.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Leave type deactivated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
