const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfDays: { type: Number },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    adminRemark: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    isHalfDay: { type: Boolean, default: false },
    attachmentUrl: { type: String, default: '' }
}, { timestamps: true });

// Calculate number of days before saving
leaveRequestSchema.pre('save', function (next) {
    if (this.startDate && this.endDate) {
        const diff = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
        this.numberOfDays = this.isHalfDay ? 0.5 : diff;
    }
    next();
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
