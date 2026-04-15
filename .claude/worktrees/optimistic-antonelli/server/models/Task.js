const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    taskId: { type: String, unique: true, sparse: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    startDate: { type: Date },
    dueDate: { type: Date },
    description: { type: String, default: '' },
    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'in-progress', 'review', 'completed', 'rejected'], default: 'pending' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    attachments: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    tags: [{ type: String }]
}, { timestamps: true });

taskSchema.pre('save', async function (next) {
    if (!this.taskId) {
        const count = await mongoose.model('Task').countDocuments();
        this.taskId = `TSK-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Task', taskSchema);
