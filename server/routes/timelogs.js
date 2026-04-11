const express = require('express');
const router = express.Router();
const TimeLog = require('../models/TimeLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/timelogs
router.get('/', protect, async (req, res) => {
    try {
        const { project, task, user, startDate, endDate, isApproved } = req.query;
        const filter = {};
        if (req.user.role === 'developer') filter.user = req.user._id;
        else if (user) filter.user = user;
        if (project) filter.project = project;
        if (task) filter.task = task;
        if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        const logs = await TimeLog.find(filter)
            .populate('user', 'name avatar')
            .populate('project', 'name projectId')
            .populate('task', 'name taskId')
            .populate('approvedBy', 'name')
            .sort({ date: -1 });
        res.json({ success: true, count: logs.length, logs });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/timelogs/summary — weekly totals per user
router.get('/summary', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        const { project } = req.query;
        const match = project ? { project: require('mongoose').Types.ObjectId.createFromHexString(project) } : {};
        const summary = await TimeLog.aggregate([
            { $match: match },
            { $group: { _id: '$user', totalHours: { $sum: '$hours' }, billable: { $sum: { $cond: [{ $eq: ['$type', 'billable'] }, '$hours', 0] } }, nonBillable: { $sum: { $cond: [{ $eq: ['$type', 'non-billable'] }, '$hours', 0] } } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { 'user.name': 1, 'user.email': 1, 'user.avatar': 1, totalHours: 1, billable: 1, nonBillable: 1 } }
        ]);
        res.json({ success: true, summary });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/timelogs
router.post('/', protect, async (req, res) => {
    try {
        const log = await TimeLog.create({ ...req.body, user: req.user._id });
        await log.populate('project', 'name');
        await log.populate('task', 'name');
        res.status(201).json({ success: true, log });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/timelogs/:id/approve — PM approves
router.put('/:id/approve', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        const log = await TimeLog.findByIdAndUpdate(req.params.id,
            { isApproved: true, approvedBy: req.user._id, approvedAt: new Date() },
            { new: true }
        ).populate('user', 'name').populate('project', 'name');
        if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
        res.json({ success: true, log });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/timelogs/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const log = await TimeLog.findById(req.params.id);
        if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
        if (req.user.role === 'developer' && log.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (log.isApproved) return res.status(400).json({ success: false, message: 'Cannot edit an approved log' });
        Object.assign(log, req.body);
        await log.save();
        res.json({ success: true, log });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/timelogs/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const log = await TimeLog.findById(req.params.id);
        if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
        if (req.user.role === 'developer' && log.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (log.isApproved) return res.status(400).json({ success: false, message: 'Cannot delete an approved log' });
        await TimeLog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Time log deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
