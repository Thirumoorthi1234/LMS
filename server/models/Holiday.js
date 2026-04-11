const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['national', 'regional', 'company', 'optional'], default: 'national' },
    description: { type: String, default: '' },
    isRecurring: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
