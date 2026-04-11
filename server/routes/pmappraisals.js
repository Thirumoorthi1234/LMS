const express = require('express');
const router = express.Router();
const PMAppraisal = require('../models/PMAppraisal');
const { protect, requireRole } = require('../middleware/auth');

const populateOpts = [
    { path: 'employee', select: 'name email avatar department position employeeId' },
    { path: 'project', select: 'name projectId' },
    { path: 'reportingManager', select: 'name email' },
    { path: 'managerReview.reviewedBy', select: 'name' },
    { path: 'hrReview.reviewedBy', select: 'name' },
];

// GET /api/pmappraisals — scoped by role
router.get('/', protect, async (req, res) => {
    try {
        const { status, department } = req.query;
        let filter = {};

        if (req.user.role === 'employee' || req.user.role === 'developer') {
            filter.employee = req.user._id;
        } else if (req.user.role === 'pm') {
            filter['managerReview.reviewedBy'] = req.user._id;
            // Also show unassigned ones for PM to pick up
            filter = { $or: [{ 'managerReview.reviewedBy': req.user._id }, { reportingManager: req.user._id }] };
        }
        if (status) filter.status = status;

        const appraisals = await PMAppraisal.find(filter)
            .populate(populateOpts)
            .sort({ createdAt: -1 });
        res.json({ success: true, count: appraisals.length, appraisals });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/pmappraisals/stats — for PM dashboard
router.get('/stats', protect, requireRole('pm', 'admin', 'hr'), async (req, res) => {
    try {
        const filter = req.user.role === 'pm' ? { reportingManager: req.user._id } : {};
        const statuses = ['draft', 'submitted', 'under-review', 'hr-review', 'approved', 'rejected'];
        const counts = await Promise.all(statuses.map(s => PMAppraisal.countDocuments({ ...filter, status: s })));
        const stats = Object.fromEntries(statuses.map((s, i) => [s.replace('-', '_'), counts[i]]));
        const levels = await PMAppraisal.aggregate([
            { $match: { ...filter, 'hrReview.finalCategoryLevel': { $ne: null } } },
            { $group: { _id: '$hrReview.finalCategoryLevel', count: { $sum: 1 } } }
        ]);
        res.json({ success: true, stats: { ...stats, total: counts.reduce((a, b) => a + b, 0), levels } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/pmappraisals/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const appraisal = await PMAppraisal.findById(req.params.id).populate(populateOpts);
        if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found' });
        res.json({ success: true, appraisal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/pmappraisals — Employee creates draft
router.post('/', protect, async (req, res) => {
    try {
        const existing = await PMAppraisal.findOne({ employee: req.user._id, status: { $in: ['draft', 'submitted', 'under-review'] } });
        if (existing) return res.status(400).json({ success: false, message: 'You already have an open appraisal.' });
        const appraisal = await PMAppraisal.create({
            employee: req.user._id,
            ...req.body,
            auditLog: [{ action: 'created', performedBy: req.user._id, note: 'Appraisal created as draft' }]
        });
        await appraisal.populate(populateOpts);
        res.status(201).json({ success: true, appraisal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/pmappraisals/:id — Employee saves/submits self-appraisal
router.put('/:id', protect, async (req, res) => {
    try {
        const appraisal = await PMAppraisal.findById(req.params.id);
        if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

        // Employee: only edit in draft stage
        if ((req.user.role === 'employee' || req.user.role === 'developer') && appraisal.status !== 'draft') {
            return res.status(403).json({ success: false, message: 'Cannot edit after submission' });
        }

        Object.assign(appraisal, req.body);
        appraisal.auditLog.push({ action: 'updated', performedBy: req.user._id, note: req.body._note || 'Record updated' });
        await appraisal.save();
        await appraisal.populate(populateOpts);
        res.json({ success: true, appraisal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/pmappraisals/:id/submit — Employee submits self-appraisal
router.post('/:id/submit', protect, async (req, res) => {
    try {
        const appraisal = await PMAppraisal.findById(req.params.id);
        if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });
        if (appraisal.employee.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Not your appraisal' });
        if (appraisal.status !== 'draft') return res.status(400).json({ success: false, message: 'Already submitted' });

        appraisal.status = 'submitted';
        appraisal.selfAppraisal.submittedAt = new Date();
        appraisal.auditLog.push({ action: 'submitted', performedBy: req.user._id, note: 'Employee submitted self-appraisal' });
        await appraisal.save();
        await appraisal.populate(populateOpts);
        res.json({ success: true, appraisal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/pmappraisals/:id/review — PM submits manager review
router.post('/:id/review', protect, requireRole('pm', 'admin'), async (req, res) => {
    try {
        const appraisal = await PMAppraisal.findById(req.params.id);
        if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });
        if (!['submitted', 'under-review'].includes(appraisal.status))
            return res.status(400).json({ success: false, message: 'Appraisal not in reviewable state' });

        appraisal.managerReview = {
            ...appraisal.managerReview,
            ...req.body.managerReview,
            reviewedBy: req.user._id,
            reviewedAt: new Date()
        };
        appraisal.status = 'hr-review';
        appraisal.auditLog.push({ action: 'manager-reviewed', performedBy: req.user._id, note: `Category Level ${req.body.managerReview?.categoryLevel} assigned` });
        await appraisal.save();
        await appraisal.populate(populateOpts);
        res.json({ success: true, appraisal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/pmappraisals/:id/approve — HR approves
router.post('/:id/approve', protect, requireRole('hr', 'admin'), async (req, res) => {
    try {
        const appraisal = await PMAppraisal.findById(req.params.id);
        if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

        appraisal.hrReview = {
            reviewedBy: req.user._id,
            finalCategoryLevel: req.body.finalCategoryLevel || appraisal.managerReview?.categoryLevel,
            hrRemarks: req.body.hrRemarks || '',
            approvedAt: new Date()
        };
        appraisal.status = 'approved';
        appraisal.auditLog.push({ action: 'hr-approved', performedBy: req.user._id, note: req.body.hrRemarks || 'HR approved' });
        await appraisal.save();
        await appraisal.populate(populateOpts);
        res.json({ success: true, appraisal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/pmappraisals/:id/reject — HR rejects
router.post('/:id/reject', protect, requireRole('hr', 'admin'), async (req, res) => {
    try {
        const appraisal = await PMAppraisal.findById(req.params.id);
        if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });
        appraisal.status = 'rejected';
        appraisal.auditLog.push({ action: 'hr-rejected', performedBy: req.user._id, note: req.body.reason || 'Rejected by HR' });
        await appraisal.save();
        res.json({ success: true, appraisal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/pmappraisals/:id — Admin only
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
    try {
        await PMAppraisal.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
