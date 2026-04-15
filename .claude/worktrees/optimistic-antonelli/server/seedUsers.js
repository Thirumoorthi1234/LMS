const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const dummyUsers = [
    // Admins (2)
    { name: 'Admin One', email: 'admin1@lms.com', password: 'Password@123', role: 'admin', employeeId: 'A101', department: 'Administration', position: 'System Admin' },
    { name: 'Admin Two', email: 'admin2@lms.com', password: 'Password@123', role: 'admin', employeeId: 'A102', department: 'Administration', position: 'System Admin' },

    // HR (3)
    { name: 'HR One', email: 'hr1@lms.com', password: 'Password@123', role: 'hr', employeeId: 'HR101', department: 'Human Resources', position: 'HR Manager' },
    { name: 'HR Two', email: 'hr2@lms.com', password: 'Password@123', role: 'hr', employeeId: 'HR102', department: 'Human Resources', position: 'HR Executive' },
    { name: 'HR Three', email: 'hr3@lms.com', password: 'Password@123', role: 'hr', employeeId: 'HR103', department: 'Human Resources', position: 'HR Recruiter' },

    // PM (3)
    { name: 'PM One', email: 'pm1@lms.com', password: 'Password@123', role: 'pm', employeeId: 'PM101', department: 'Project Management', position: 'Project Manager' },
    { name: 'PM Two', email: 'pm2@lms.com', password: 'Password@123', role: 'pm', employeeId: 'PM102', department: 'Project Management', position: 'Project Manager' },
    { name: 'PM Three', email: 'pm3@lms.com', password: 'Password@123', role: 'pm', employeeId: 'PM103', department: 'Project Management', position: 'Project Manager' },
];

// Employees (12)
for (let i = 1; i <= 12; i++) {
    const idNum = i < 10 ? `0${i}` : i;
    dummyUsers.push({
        name: `Employee ${i}`,
        email: `emp${i}@lms.com`,
        password: 'Password@123',
        role: 'employee',
        employeeId: `E10${idNum}`,
        department: i % 2 === 0 ? 'Engineering' : 'Design',
        position: i % 2 === 0 ? 'Software Engineer' : 'UI/UX Designer'
    });
}

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        let createdCount = 0;
        for (const user of dummyUsers) {
            const existing = await User.findOne({ email: user.email });
            if (!existing) {
                // Remove the extra EmployeeId check just in case, unique constraint is on email and sparse on employeeId.
                await User.create(user);
                console.log(`✅ Created user: ${user.email} (${user.role})`);
                createdCount++;
            } else {
                console.log(`ℹ️  User already exists: ${user.email}`);
            }
        }
        
        console.log(`🎉 Seeding completed successfully! Created ${createdCount} new users.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during seeding:', err.message);
        process.exit(1);
    }
}

seedUsers();
