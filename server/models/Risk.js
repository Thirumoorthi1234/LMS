const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    riskId: { type: String, unique: true, sparse: true },
    description: { type: String, required: true },
    level: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    impact: { type: String, default: '' },
    mitigationPlan: { type: String, default: '' },
    responsiblePerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['identified', 'mitigating', 'resolved', 'accepted'], default: 'identified' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

riskSchema.pre('save', async function (next) {
    if (!this.riskId) {
        const count = await mongoose.model('Risk').countDocuments();
        this.riskId = `RSK-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Risk', riskSchema);
