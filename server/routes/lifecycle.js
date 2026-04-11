const express = require('express');
const router = express.Router();
const LifecycleEvent = require('../models/LifecycleEvent');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/lifecycle - list all events (admin/hr)
router.get('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { type, status, employee } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (employee) filter.employee = employee;
        const events = await LifecycleEvent.find(filter)
            .populate('employee', 'name employeeId department position')
            .populate('createdBy', 'name')
            .sort({ date: -1 });
        res.json({ success: true, count: events.length, events });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/lifecycle/employee/:empId - events for one employee
router.get('/employee/:empId', protect, async (req, res) => {
    try {
        if (req.user.role === 'employee' && req.user._id.toString() !== req.params.empId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const events = await LifecycleEvent.find({ employee: req.params.empId })
            .populate('createdBy', 'name')
            .sort({ date: -1 });
        res.json({ success: true, count: events.length, events });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/lifecycle/stats
router.get('/stats', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const byCounts = await LifecycleEvent.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);
        const statusCounts = await LifecycleEvent.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        res.json({ success: true, stats: { byType: byCounts, byStatus: statusCounts } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/lifecycle - create event
router.post('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const event = await LifecycleEvent.create({ ...req.body, createdBy: req.user._id });
        await event.populate('employee', 'name employeeId department');
        res.status(201).json({ success: true, event });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/lifecycle/:id
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const update = { ...req.body };
        if (update.status === 'completed' && !update.completedAt) update.completedAt = new Date();
        const event = await LifecycleEvent.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
            .populate('employee', 'name employeeId department position')
            .populate('createdBy', 'name');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        res.json({ success: true, event });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/lifecycle/:id
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        await LifecycleEvent.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Lifecycle event deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
