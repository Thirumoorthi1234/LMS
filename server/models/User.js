const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'employee', 'hr', 'pm', 'client', 'developer'], default: 'employee' },
    department: { type: String, default: '' },
    position: { type: String, default: '' },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    employeeId: { type: String, unique: true, sparse: true },
    joiningDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    leaveBalance: {
        annual: { type: Number, default: 12 },
        sick: { type: Number, default: 8 },
        casual: { type: Number, default: 6 },
        maternity: { type: Number, default: 90 },
        paternity: { type: Number, default: 15 },
        unpaid: { type: Number, default: 30 }
    },
    salary: {
        base: { type: Number, default: 0 },
        allowances: {
            hra: { type: Number, default: 0 },
            transport: { type: Number, default: 0 },
            other: { type: Number, default: 0 }
        },
        deductions: {
            pf: { type: Number, default: 0 },
            tax: { type: Number, default: 0 }
        }
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
