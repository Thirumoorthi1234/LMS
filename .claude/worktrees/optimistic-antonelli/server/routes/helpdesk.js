const express = require('express');
const router = express.Router();
const HelpDesk = require('../models/HelpDesk');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/helpdesk - admin/hr: all; employee: own
router.get('/', protect, async (req, res) => {
    try {
        const { status, priority, category } = req.query;
        const filter = {};
        if (req.user.role === 'employee') filter.submittedBy = req.user._id;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;
        const tickets = await HelpDesk.find(filter)
            .populate('submittedBy', 'name employeeId department')
            .populate('assignedTo', 'name')
            .populate('comments.by', 'name role')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: tickets.length, tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/helpdesk/stats
router.get('/stats', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const [total, open, inProgress, resolved] = await Promise.all([
            HelpDesk.countDocuments(),
            HelpDesk.countDocuments({ status: 'open' }),
            HelpDesk.countDocuments({ status: 'in-progress' }),
            HelpDesk.countDocuments({ status: 'resolved' })
        ]);
        res.json({ success: true, stats: { total, open, inProgress, resolved } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/helpdesk/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const ticket = await HelpDesk.findById(req.params.id)
            .populate('submittedBy', 'name employeeId department')
            .populate('assignedTo', 'name')
            .populate('comments.by', 'name role');
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        if (req.user.role === 'employee' && ticket.submittedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/helpdesk - any authenticated user creates a ticket
router.post('/', protect, async (req, res) => {
    try {
        const ticket = await HelpDesk.create({ ...req.body, submittedBy: req.user._id });
        res.status(201).json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/helpdesk/:id - update status/assignment/add comment
router.put('/:id', protect, async (req, res) => {
    try {
        const ticket = await HelpDesk.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        // Employee can only add comments to own tickets
        if (req.user.role === 'employee') {
            if (ticket.submittedBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
            // Employee can only add a comment, not change status/assignment
            if (req.body.comment) {
                ticket.comments.push({ by: req.user._id, text: req.body.comment });
                await ticket.save();
                return res.json({ success: true, ticket });
            }
            return res.status(403).json({ success: false, message: 'Employees can only add comments' });
        }

        const { comment, ...updateData } = req.body;
        Object.assign(ticket, updateData);
        if (comment) ticket.comments.push({ by: req.user._id, text: comment });
        if (updateData.status === 'resolved' && !ticket.resolvedAt) ticket.resolvedAt = new Date();
        await ticket.save();
        await ticket.populate('submittedBy', 'name employeeId department');
        await ticket.populate('assignedTo', 'name');
        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/helpdesk/:id - admin only
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
    try {
        await HelpDesk.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Ticket deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
