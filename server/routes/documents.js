const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/documents - admin/hr: all docs; filter by employee
router.get('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { employee, type } = req.query;
        const filter = { isActive: true };
        if (employee) filter.employee = employee;
        if (type) filter.type = type;
        const docs = await Document.find(filter)
            .populate('employee', 'name employeeId department')
            .populate('generatedBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: docs.length, documents: docs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/documents/mine - employee: own docs
router.get('/mine', protect, async (req, res) => {
    try {
        const docs = await Document.find({ employee: req.user._id, isActive: true })
            .populate('generatedBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: docs.length, documents: docs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/documents/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id)
            .populate('employee', 'name employeeId department position')
            .populate('generatedBy', 'name');
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        // Employee can only access own docs
        if (req.user.role === 'employee' && doc.employee._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.json({ success: true, document: doc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/documents - create/generate document
router.post('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const doc = await Document.create({ ...req.body, generatedBy: req.user._id });
        res.status(201).json({ success: true, document: doc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/documents/:id
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const doc = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('employee', 'name employeeId department');
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        res.json({ success: true, document: doc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/documents/:id (soft delete)
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        await Document.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
