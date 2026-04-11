const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    baseSalary: {
        type: Number,
        required: true
    },
    allowances: {
        hra: { type: Number, default: 0 },
        transport: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    deductions: {
        pf: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        lop: { type: Number, default: 0 } // Loss of Pay
    },
    netSalary: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Paid', 'Cancelled'],
        default: 'Draft'
    },
    paidAt: {
        type: Date
    },
    remarks: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Ensure unique payroll per user per month/year
payrollSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
