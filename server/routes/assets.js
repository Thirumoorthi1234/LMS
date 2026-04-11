const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/assets - list all assets
router.get('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { status, type, assignedTo } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (assignedTo) filter.assignedTo = assignedTo;
        const assets = await Asset.find(filter)
            .populate('assignedTo', 'name employeeId department')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: assets.length, assets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/assets/employee/:empId - assets for one employee
router.get('/employee/:empId', protect, async (req, res) => {
    try {
        if (req.user.role === 'employee' && req.user._id.toString() !== req.params.empId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const assets = await Asset.find({ assignedTo: req.params.empId })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: assets.length, assets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/assets - create asset
router.post('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const asset = await Asset.create({ ...req.body, createdBy: req.user._id });
        res.status(201).json({ success: true, asset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/assets/:id - update / assign
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const update = { ...req.body };
        // Auto-set dates
        if (update.assignedTo && update.status === 'assigned' && !update.assignedDate) {
            update.assignedDate = new Date();
        }
        if (update.status === 'returned' && !update.returnedDate) {
            update.returnedDate = new Date();
            update.assignedTo = null;
        }
        const asset = await Asset.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
            .populate('assignedTo', 'name employeeId department');
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
        res.json({ success: true, asset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/assets/:id
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        await Asset.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Asset deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/assets/stats
router.get('/stats', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const [total, assigned, available, returned] = await Promise.all([
            Asset.countDocuments(),
            Asset.countDocuments({ status: 'assigned' }),
            Asset.countDocuments({ status: 'available' }),
            Asset.countDocuments({ status: 'returned' })
        ]);
        res.json({ success: true, stats: { total, assigned, available, returned } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
