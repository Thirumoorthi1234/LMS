const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkIn: {
        time: { type: Date },
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String, default: '' }
    },
    checkOut: {
        time: { type: Date },
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String, default: '' }
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'half-day', 'late', 'on-leave'],
        default: 'present'
    },
    totalHours: { type: Number, default: 0 },
    notes: { type: String, default: '' }
}, { timestamps: true });

// Unique constraint: one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Auto-calculate total hours on checkout
attendanceSchema.pre('save', function (next) {
    if (this.checkIn?.time && this.checkOut?.time) {
        const diff = (this.checkOut.time - this.checkIn.time) / (1000 * 60 * 60);
        this.totalHours = Math.round(diff * 100) / 100;
    }
    next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
