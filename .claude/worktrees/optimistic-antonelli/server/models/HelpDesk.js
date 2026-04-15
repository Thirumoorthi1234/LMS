const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { _id: false });

const helpDeskSchema = new mongoose.Schema({
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['payroll', 'leave', 'attendance', 'documents', 'assets', 'benefits', 'general', 'it', 'other'],
        default: 'general'
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    comments: [commentSchema],
    resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('HelpDesk', helpDeskSchema);
