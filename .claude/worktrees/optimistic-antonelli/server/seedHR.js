const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Inline User model to avoid circular requires
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['admin', 'employee', 'hr'], default: 'employee' },
    department: { type: String, default: '' },
    position: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    employeeId: { type: String, unique: true, sparse: true },
    leaveBalance: {
        annual: { type: Number, default: 12 },
        sick: { type: Number, default: 8 },
        casual: { type: Number, default: 6 },
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedHR() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await User.findOne({ email: 'hr@lms.com' });
        if (existing) {
            // update role if needed
            if (existing.role !== 'hr') {
                await User.updateOne({ _id: existing._id }, { role: 'hr' });
                console.log('✅ Updated existing user hr@lms.com to role hr');
            } else {
                console.log('ℹ️  HR user hr@lms.com already exists with role hr');
            }
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash('Hr@123', salt);
            await User.create({
                name: 'HR Manager',
                email: 'hr@lms.com',
                password: hashed,
                role: 'hr',
                department: 'HR',
                position: 'HR Manager',
                employeeId: 'HR001',
                isActive: true
            });
            console.log('✅ Created HR demo user: hr@lms.com / Hr@123');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

seedHR();
