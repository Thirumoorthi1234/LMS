const mongoose = require('mongoose');

const lifecycleEventSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['onboarding', 'bgv', 'confirmation', 'salary-revision', 'exit', 'promotion', 'transfer', 'other'],
        required: true
    },
    date: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: '' },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('LifecycleEvent', lifecycleEventSchema);
