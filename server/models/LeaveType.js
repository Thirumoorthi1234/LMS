const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    defaultDays: { type: Number, required: true, default: 0 },
    color: { type: String, default: '#4F9CF9' },
    carryForward: { type: Boolean, default: false },
    maxCarryForward: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: true },
    applicableGender: { type: String, enum: ['all', 'male', 'female'], default: 'all' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
