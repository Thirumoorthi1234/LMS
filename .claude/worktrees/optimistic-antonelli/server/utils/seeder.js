const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const Holiday = require('../models/Holiday');

dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for seeding...');

        // Seed leave types
        const leaveTypes = [
            { name: 'Annual Leave', code: 'ANNUAL', defaultDays: 12, color: '#4F9CF9', carryForward: true, maxCarryForward: 5, isPaid: true, description: 'Yearly paid leave' },
            { name: 'Sick Leave', code: 'SICK', defaultDays: 8, color: '#F97316', carryForward: false, isPaid: true, description: 'Medical/health leave' },
            { name: 'Casual Leave', code: 'CASUAL', defaultDays: 6, color: '#10B981', carryForward: false, isPaid: true, description: 'Personal/casual purpose leave' },
            { name: 'Maternity Leave', code: 'MATERNITY', defaultDays: 90, color: '#EC4899', carryForward: false, isPaid: true, applicableGender: 'female', description: 'Maternity leave for female employees' },
            { name: 'Paternity Leave', code: 'PATERNITY', defaultDays: 15, color: '#6366F1', carryForward: false, isPaid: true, applicableGender: 'male', description: 'Paternity leave for male employees' },
            { name: 'Unpaid Leave', code: 'UNPAID', defaultDays: 30, color: '#9CA3AF', carryForward: false, isPaid: false, description: 'Leave without pay' },
        ];

        for (const lt of leaveTypes) {
            await LeaveType.findOneAndUpdate({ code: lt.code }, lt, { upsert: true, new: true });
        }
        console.log('✅ Leave types seeded');

        // Seed admin
        const adminExists = await User.findOne({ email: 'admin@lms.com' });
        if (!adminExists) {
            await User.create({
                name: 'System Admin',
                email: 'admin@lms.com',
                password: 'Admin@123',
                role: 'admin',
                department: 'Administration',
                position: 'HR Manager',
                employeeId: 'EMP001',
                isActive: true
            });
            console.log('✅ Admin user created: admin@lms.com / Admin@123');
        } else {
            console.log('ℹ️  Admin already exists');
        }

        // Seed employee
        const empExists = await User.findOne({ email: 'emp@lms.com' });
        if (!empExists) {
            await User.create({
                name: 'John Employee',
                email: 'emp@lms.com',
                password: 'Emp@123',
                role: 'employee',
                department: 'Engineering',
                position: 'Software Developer',
                employeeId: 'EMP002',
                isActive: true,
                leaveBalance: { annual: 12, sick: 8, casual: 6, maternity: 0, paternity: 15, unpaid: 30 }
            });
            console.log('✅ Employee user created: emp@lms.com / Emp@123');
        } else {
            console.log('ℹ️  Employee already exists');
        }

        // Seed HR user
        const hrExists = await User.findOne({ email: 'hr@lms.com' });
        if (!hrExists) {
            await User.create({
                name: 'HR Manager',
                email: 'hr@lms.com',
                password: 'Hr@123',
                role: 'hr',
                department: 'Human Resources',
                position: 'HR Manager',
                employeeId: 'EMP003',
                isActive: true,
                leaveBalance: { annual: 12, sick: 8, casual: 6, maternity: 0, paternity: 15, unpaid: 30 }
            });
            console.log('✅ HR user created: hr@lms.com / Hr@123');
        } else {
            console.log('ℹ️  HR user already exists');
        }

        // Seed PM user
        const pmExists = await User.findOne({ email: 'pm@lms.com' });
        if (!pmExists) {
            await User.create({
                name: 'Project Manager',
                email: 'pm@lms.com',
                password: 'Pm@123',
                role: 'pm',
                department: 'Engineering',
                position: 'Project Manager',
                employeeId: 'EMP004',
                skills: ['Project Planning', 'Agile', 'Risk Management'],
                isActive: true
            });
            console.log('✅ PM user created: pm@lms.com / Pm@123');
        } else {
            console.log('ℹ️  PM user already exists');
        }

        // Seed Developer user
        const devExists = await User.findOne({ email: 'dev@lms.com' });
        if (!devExists) {
            await User.create({
                name: 'Alex Developer',
                email: 'dev@lms.com',
                password: 'Dev@123',
                role: 'developer',
                department: 'Engineering',
                position: 'Full Stack Developer',
                employeeId: 'EMP005',
                skills: ['React', 'Node.js', 'MongoDB'],
                isActive: true,
                leaveBalance: { annual: 12, sick: 8, casual: 6, maternity: 0, paternity: 15, unpaid: 30 }
            });
            console.log('✅ Developer user created: dev@lms.com / Dev@123');
        } else {
            console.log('ℹ️  Developer user already exists');
        }

        // Seed Client user
        const clientExists = await User.findOne({ email: 'client@lms.com' });
        if (!clientExists) {
            await User.create({
                name: 'Client Stakeholder',
                email: 'client@lms.com',
                password: 'Client@123',
                role: 'client',
                department: 'External',
                position: 'Stakeholder',
                employeeId: 'EMP006',
                isActive: true
            });
            console.log('✅ Client user created: client@lms.com / Client@123');
        } else {
            console.log('ℹ️  Client user already exists');
        }


        // Seed holidays
        const year = new Date().getFullYear();
        const holidays = [
            { name: 'New Year\'s Day', date: new Date(`${year}-01-01`), type: 'national' },
            { name: 'Republic Day', date: new Date(`${year}-01-26`), type: 'national' },
            { name: 'Independence Day', date: new Date(`${year}-08-15`), type: 'national' },
            { name: 'Gandhi Jayanti', date: new Date(`${year}-10-02`), type: 'national' },
            { name: 'Christmas Day', date: new Date(`${year}-12-25`), type: 'national' },
            { name: 'Diwali', date: new Date(`${year}-10-20`), type: 'regional' },
            { name: 'Holi', date: new Date(`${year}-03-14`), type: 'regional' },
            { name: 'Eid ul-Fitr', date: new Date(`${year}-04-10`), type: 'regional' },
        ];

        for (const h of holidays) {
            await Holiday.findOneAndUpdate({ name: h.name, date: h.date }, h, { upsert: true });
        }
        console.log('✅ Holidays seeded');

        console.log('\n🎉 Database seeded successfully!');
        console.log('👤 Admin login: admin@lms.com / Admin@123');
        console.log('👤 Employee login: emp@lms.com / Emp@123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err.message);
        process.exit(1);
    }
};

seed();
