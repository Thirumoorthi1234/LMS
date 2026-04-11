const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const { project, severity, status } = req.query;
        const filter = {};
        if (project) filter.project = project;
        if (severity) filter.severity = severity;
        if (status) filter.status = status;
        const issues = await Issue.find(filter)
            .populate('project', 'name projectId')
            .populate('assignedTo', 'name email avatar')
            .populate('reportedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: issues.length, issues });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, async (req, res) => {
    try {
        const issue = await Issue.create({ ...req.body, reportedBy: req.user._id });
        await issue.populate('project', 'name projectId');
        res.status(201).json({ success: true, issue });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
    try {
        const update = req.body;
        if (update.status === 'fixed' && !update.resolvedAt) update.resolvedAt = new Date();
        const issue = await Issue.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
            .populate('project', 'name projectId')
            .populate('assignedTo', 'name email avatar')
            .populate('reportedBy', 'name');
        if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
        res.json({ success: true, issue });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        await Issue.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Issue deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
