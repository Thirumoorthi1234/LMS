const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const TimeLog = require('../models/TimeLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/tasks — with project/status/assignee filter
router.get('/', protect, async (req, res) => {
    try {
        const { project, status, assignedTo, priority, parentTask } = req.query;
        const filter = {};
        if (project) filter.project = project;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (parentTask === 'null') filter.parentTask = null;
        else if (parentTask) filter.parentTask = parentTask;
        // Developer: only own tasks
        if (req.user.role === 'developer') filter.assignedTo = req.user._id;
        else if (assignedTo) filter.assignedTo = assignedTo;

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name')
            .populate('project', 'name projectId')
            .populate('parentTask', 'name taskId')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: tasks.length, tasks });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/tasks/stats
router.get('/stats', protect, async (req, res) => {
    try {
        const filter = req.user.role === 'developer' ? { assignedTo: req.user._id } : {};
        const statuses = ['pending', 'in-progress', 'review', 'completed', 'rejected'];
        const counts = await Promise.all(statuses.map(s => Task.countDocuments({ ...filter, status: s })));
        const overdue = await Task.countDocuments({ ...filter, dueDate: { $lt: new Date() }, status: { $nin: ['completed', 'rejected'] } });
        const stats = Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
        res.json({ success: true, stats: { ...stats, overdue, total: counts.reduce((a, b) => a + b, 0) } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email avatar')
            .populate('project', 'name projectId')
            .populate('parentTask', 'name taskId')
            .populate('dependencies', 'name taskId status');
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, task });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/tasks
router.post('/', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        const task = await Task.create({ ...req.body, createdBy: req.user._id });
        await task.populate('assignedTo', 'name email avatar');
        await task.populate('project', 'name projectId');
        res.status(201).json({ success: true, task });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/tasks/:id — PM: full update; Developer: status+progress only
router.put('/:id', protect, async (req, res) => {
    try {
        let updateData = req.body;
        // Developers can only update status, progress, loggedHours
        if (req.user.role === 'developer') {
            const allowed = ['status', 'progress', 'loggedHours'];
            updateData = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        }
        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('assignedTo', 'name email avatar')
            .populate('project', 'name projectId');
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, task });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/tasks/:id
router.delete('/:id', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Task deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
