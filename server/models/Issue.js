const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    issueId: { type: String, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'in-progress', 'fixed', 'closed', 'rejected'], default: 'open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedAt: { type: Date }
}, { timestamps: true });

issueSchema.pre('save', async function (next) {
    if (!this.issueId) {
        const count = await mongoose.model('Issue').countDocuments();
        this.issueId = `ISS-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Issue', issueSchema);
