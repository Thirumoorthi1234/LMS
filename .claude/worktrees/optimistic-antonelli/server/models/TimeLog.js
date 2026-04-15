const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, default: Date.now },
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    description: { type: String, default: '' },
    type: { type: String, enum: ['billable', 'non-billable'], default: 'billable' },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('TimeLog', timeLogSchema);
