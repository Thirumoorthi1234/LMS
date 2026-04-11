const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Announcement = require('./models/Announcement');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Attendance = require('./models/Attendance');
const LeaveType = require('./models/LeaveType');
const LeaveRequest = require('./models/LeaveRequest');
const Holiday = require('./models/Holiday');
const Asset = require('./models/Asset');

async function clearCollections() {
    await Announcement.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Attendance.deleteMany({});
    await LeaveRequest.deleteMany({});
    await LeaveType.deleteMany({});
    await Holiday.deleteMany({});
    await Asset.deleteMany({});
}

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('Clearing existing sample data...');
        await clearCollections();

        const admins = await User.find({ role: 'admin' });
        const pms = await User.find({ role: 'pm' });
        const hrs = await User.find({ role: 'hr' });
        const employees = await User.find({ role: 'employee' });

        if (!admins.length || !pms.length || !employees.length) {
            console.error('Please run seedUsers.js first!');
            process.exit(1);
        }

        const admin = admins[0];
        const hr = hrs[0] || admin;
        const pm = pms[0];

        console.log('Seeding Announcements...');
        await Announcement.create([
            { title: 'Welcome to the New LMS!', content: 'We are thrilled to launch our new Leave & Project Management System.', postedBy: admin._id, type: 'announcement', tags: ['Company', 'Update'] },
            { title: 'Upcoming Public Holiday', content: 'Please note the office will be closed on Friday.', postedBy: hr._id, type: 'alert', tags: ['Holiday'] }
        ]);

        console.log('Seeding Holidays...');
        await Holiday.create([
            { name: 'New Year', date: new Date(new Date().getFullYear(), 0, 1), type: 'national', description: 'New Year celebrations' },
            { name: 'Labor Day', date: new Date(new Date().getFullYear(), 4, 1), type: 'national', description: 'Labor Day' },
            { name: 'Company Retreat', date: new Date(new Date().getFullYear(), 7, 15), type: 'company', description: 'Annual company retreat' }
        ]);

        console.log('Seeding Leave Types...');
        const leaveTypes = await LeaveType.create([
            { name: 'Annual Leave', code: 'AL', daysLimit: 12, genderRestriction: 'all', color: '#4F9CF9', description: 'Standard annual leave' },
            { name: 'Sick Leave', code: 'SL', daysLimit: 8, genderRestriction: 'all', color: '#F97316', description: 'Medical emergencies' },
            { name: 'Casual Leave', code: 'CL', daysLimit: 6, genderRestriction: 'all', color: '#10B981', description: 'Short casual leaves' }
        ]);

        console.log('Seeding Leave Requests...');
        for (let i = 0; i < 5; i++) {
            const emp = employees[i % employees.length];
            await LeaveRequest.create({
                employee: emp._id,
                leaveType: leaveTypes[0]._id,
                startDate: new Date(Date.now() + 86400000 * (i + 1)),
                endDate: new Date(Date.now() + 86400000 * (i + 2)),
                reason: 'Family event',
                status: i % 2 === 0 ? 'approved' : 'pending',
                reviewedBy: i % 2 === 0 ? hr._id : null
            });
        }

        console.log('Seeding Projects & Tasks...');
        for (let i = 0; i < 3; i++) {
            const currentPM = pms[i % pms.length];
            const project = await Project.create({
                name: `Project Alpha v${i+1}`,
                clientName: `Client ${i+1}`,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 86400000),
                budget: 50000 + (10000 * i),
                priority: i === 0 ? 'critical' : 'high',
                status: 'in-progress',
                assignedPM: currentPM._id,
                team: [employees[0]._id, employees[1]._id, employees[2]._id],
                progress: 20 + i * 10,
                createdBy: admin._id
            });

            for (let j = 0; j < 4; j++) {
                await Task.create({
                    name: `Implementation Step ${j+1}`,
                    project: project._id,
                    assignedTo: employees[j % 3]._id,
                    createdBy: currentPM._id,
                    priority: 'medium',
                    dueDate: new Date(Date.now() + 7 * 86400000),
                    status: j === 0 ? 'completed' : 'in-progress',
                    progress: j === 0 ? 100 : 50
                });
            }
        }

        console.log('Seeding Assets...');
        for (let i = 0; i < 5; i++) {
            await Asset.create({
                name: `MacBook Pro M3 ${i+1}`,
                type: 'laptop',
                brand: 'Apple',
                model: 'MacBook Pro',
                serialNumber: `SN-MAC-${1000+i}`,
                purchaseDate: new Date(),
                purchaseValue: 2000,
                status: 'assigned',
                assignedTo: employees[i]._id,
                assignedDate: new Date()
            });
        }

        console.log('Seeding Attendance...');
        const today = new Date();
        for (let i = 0; i < 5; i++) {
            const emp = employees[i];
            for (let d = 0; d < 5; d++) {
                const date = new Date(today);
                date.setDate(today.getDate() - d - 1);
                const dateStr = date.toISOString().split('T')[0];

                const checkInTime = new Date(date);
                checkInTime.setHours(9, 0, 0, 0);

                const checkOutTime = new Date(date);
                checkOutTime.setHours(17, 30, 0, 0);

                await Attendance.create({
                    employee: emp._id,
                    date: dateStr,
                    checkIn: { time: checkInTime, latitude: 12.9716, longitude: 77.5946, address: 'Bangalore, India' },
                    checkOut: { time: checkOutTime, latitude: 12.9716, longitude: 77.5946, address: 'Bangalore, India' },
                    status: 'present',
                    totalHours: 8.5
                });
            }
        }

        console.log('🎉 Database Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during seeding:', err);
        process.exit(1);
    }
}

seedData();
