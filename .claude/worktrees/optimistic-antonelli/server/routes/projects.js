const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect, requireRole } = require('../middleware/auth');

const PM_ROLES = ['admin', 'pm'];

// GET /api/projects — admin/pm: all; client: assigned; dev: team member
router.get('/', protect, async (req, res) => {
    try {
        const { status, priority, search } = req.query;
        let filter = {};
        if (req.user.role === 'client') filter.clientUser = req.user._id;
        if (req.user.role === 'developer') filter.team = req.user._id;
        if (req.user.role === 'pm') filter.$or = [{ assignedPM: req.user._id }, { team: req.user._id }];
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (search) filter.name = { $regex: search, $options: 'i' };

        const projects = await Project.find(filter)
            .populate('assignedPM', 'name email avatar')
            .populate('team', 'name email avatar role')
            .populate('clientUser', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: projects.length, projects });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/projects/stats
router.get('/stats', protect, requireRole(...PM_ROLES), async (req, res) => {
    try {
        const filter = req.user.role === 'pm' ? { assignedPM: req.user._id } : {};
        const [total, active, completed, onHold, delayed] = await Promise.all([
            Project.countDocuments(filter),
            Project.countDocuments({ ...filter, status: 'in-progress' }),
            Project.countDocuments({ ...filter, status: 'completed' }),
            Project.countDocuments({ ...filter, status: 'on-hold' }),
            Project.countDocuments({ ...filter, status: 'in-progress', endDate: { $lt: new Date() } })
        ]);
        const budgetAgg = await Project.aggregate([
            { $match: filter },
            { $group: { _id: null, totalBudget: { $sum: '$budget' }, totalActual: { $sum: '$actualCost' } } }
        ]);
        res.json({ success: true, stats: { total, active, completed, onHold, delayed, budget: budgetAgg[0] || { totalBudget: 0, totalActual: 0 } } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/projects/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('assignedPM', 'name email avatar')
            .populate('team', 'name email avatar role department skills')
            .populate('clientUser', 'name email')
            .populate('createdBy', 'name');
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true, project });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/projects
router.post('/', protect, requireRole(...PM_ROLES), async (req, res) => {
    try {
        const project = await Project.create({ ...req.body, createdBy: req.user._id });
        await project.populate('assignedPM', 'name email');
        res.status(201).json({ success: true, project });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/projects/:id
router.put('/:id', protect, requireRole(...PM_ROLES), async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('assignedPM', 'name email avatar')
            .populate('team', 'name email avatar role');
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true, project });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/projects/:id/team — add/remove team members
router.put('/:id/team', protect, requireRole(...PM_ROLES), async (req, res) => {
    try {
        const { team } = req.body;
        const project = await Project.findByIdAndUpdate(req.params.id, { team }, { new: true })
            .populate('team', 'name email avatar role');
        res.json({ success: true, project });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/projects/:id
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Project deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
