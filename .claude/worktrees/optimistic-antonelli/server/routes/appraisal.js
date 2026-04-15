const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// @GET /api/appraisals/stats - Summary stats for dashboard
router.get('/stats', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const all = await Appraisal.find().populate('employee', 'name department');
        const total = all.length;
        const byStatus = { draft: 0, submitted: 0, acknowledged: 0 };
        let ratingSum = 0;
        all.forEach(a => {
            byStatus[a.status] = (byStatus[a.status] || 0) + 1;
            ratingSum += a.avgRating;
        });
        const avgRating = total > 0 ? parseFloat((ratingSum / total).toFixed(2)) : 0;
        res.json({ success: true, stats: { total, avgRating, byStatus } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/appraisals - List all appraisals
router.get('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { status, employeeId } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (employeeId) filter.employee = employeeId;
        const appraisals = await Appraisal.find(filter)
            .populate('employee', 'name email department position')
            .populate('reviewer', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: appraisals.length, appraisals });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @POST /api/appraisals - Create appraisal
router.post('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { employee, period, ratings, comments, status } = req.body;
        if (!employee || !period) {
            return res.status(400).json({ success: false, message: 'Employee and period are required' });
        }
        const appraisal = await Appraisal.create({
            employee,
            reviewer: req.user._id,
            period,
            ratings: ratings || {},
            comments: comments || '',
            status: status || 'draft'
        });
        const populated = await Appraisal.findById(appraisal._id)
            .populate('employee', 'name email department position')
            .populate('reviewer', 'name');
        res.status(201).json({ success: true, appraisal: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/appraisals/:id
router.get('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const appraisal = await Appraisal.findById(req.params.id)
            .populate('employee', 'name email department position')
            .populate('reviewer', 'name');
        if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found' });
        res.json({ success: true, appraisal });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/appraisals/:id - Update appraisal
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { period, ratings, comments, status } = req.body;
        const appraisal = await Appraisal.findByIdAndUpdate(
            req.params.id,
            { period, ratings, comments, status },
            { new: true, runValidators: true }
        ).populate('employee', 'name email department position').populate('reviewer', 'name');
        if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found' });
        res.json({ success: true, appraisal });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @DELETE /api/appraisals/:id
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        await Appraisal.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Appraisal deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
