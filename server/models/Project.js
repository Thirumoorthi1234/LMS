const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    title: { type: String, required: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
}, { _id: true });

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    projectId: { type: String, unique: true, sparse: true },
    clientName: { type: String, default: '' },
    clientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startDate: { type: Date },
    endDate: { type: Date },
    budget: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['not-started', 'in-progress', 'on-hold', 'completed', 'cancelled'], default: 'not-started' },
    assignedPM: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    milestones: [milestoneSchema],
    tags: [{ type: String }],
    progress: { type: Number, default: 0, min: 0, max: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate projectId
projectSchema.pre('save', async function (next) {
    if (!this.projectId) {
        const count = await mongoose.model('Project').countDocuments();
        this.projectId = `PRJ-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Project', projectSchema);
