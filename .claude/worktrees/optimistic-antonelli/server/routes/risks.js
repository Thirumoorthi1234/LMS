const express = require('express');
const router = express.Router();
const Risk = require('../models/Risk');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const { project, level, status } = req.query;
        const filter = {};
        if (project) filter.project = project;
        if (level) filter.level = level;
        if (status) filter.status = status;
        const risks = await Risk.find(filter)
            .populate('project', 'name projectId')
            .populate('responsiblePerson', 'name email')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: risks.length, risks });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        const risk = await Risk.create({ ...req.body, createdBy: req.user._id });
        await risk.populate('project', 'name projectId');
        await risk.populate('responsiblePerson', 'name email');
        res.status(201).json({ success: true, risk });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        const risk = await Risk.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('project', 'name projectId')
            .populate('responsiblePerson', 'name email');
        if (!risk) return res.status(404).json({ success: false, message: 'Risk not found' });
        res.json({ success: true, risk });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, requireRole('admin', 'pm'), async (req, res) => {
    try {
        await Risk.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Risk deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
