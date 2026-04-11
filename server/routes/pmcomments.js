const express = require('express');
const router = express.Router();
const PMComment = require('../models/PMComment');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const { task } = req.query;
        if (!task) return res.status(400).json({ success: false, message: 'task query param required' });
        const comments = await PMComment.find({ task })
            .populate('author', 'name avatar role')
            .populate('mentions', 'name')
            .sort({ createdAt: 1 });
        res.json({ success: true, count: comments.length, comments });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, async (req, res) => {
    try {
        const comment = await PMComment.create({ ...req.body, author: req.user._id });
        await comment.populate('author', 'name avatar role');
        res.status(201).json({ success: true, comment });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const comment = await PMComment.findById(req.params.id);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
        if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        await PMComment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Comment deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
