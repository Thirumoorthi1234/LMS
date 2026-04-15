const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://localhost:5173',
    'https://localhost:5174',
    'http://10.110.229.181:5173',
    'http://10.110.229.181:5174',
    'https://10.110.229.181:5173',
    'https://10.110.229.181:5174'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/leave-types', require('./routes/leaveTypes'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/appraisals', require('./routes/appraisal'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/helpdesk', require('./routes/helpdesk'));
app.use('/api/lifecycle', require('./routes/lifecycle'));

// PM Portal Routes
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/timelogs', require('./routes/timelogs'));
app.use('/api/risks', require('./routes/risks'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/pmcomments', require('./routes/pmcomments'));
app.use('/api/pmappraisals', require('./routes/pmappraisals'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Connect MongoDB & Start Server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
