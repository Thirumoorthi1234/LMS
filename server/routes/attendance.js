const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, requireRole } = require('../middleware/auth');

// Helper: format date to YYYY-MM-DD
const formatDate = (d) => new Date(d).toISOString().split('T')[0];

// @POST /api/attendance/checkin
router.post('/checkin', protect, requireRole('employee'), async (req, res) => {
    try {
        const today = formatDate(new Date());
        const existing = await Attendance.findOne({ employee: req.user._id, date: today });
        if (existing && existing.checkIn?.time) {
            return res.status(400).json({ success: false, message: 'Already checked in today' });
        }
        const { latitude, longitude, address } = req.body;
        const attendance = existing
            ? existing
            : new Attendance({ employee: req.user._id, date: today });
        attendance.checkIn = { time: new Date(), latitude, longitude, address: address || '' };
        attendance.status = 'present';
        await attendance.save();
        res.json({ success: true, attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @POST /api/attendance/checkout
router.post('/checkout', protect, requireRole('employee'), async (req, res) => {
    try {
        const today = formatDate(new Date());
        const attendance = await Attendance.findOne({ employee: req.user._id, date: today });
        if (!attendance || !attendance.checkIn?.time) {
            return res.status(400).json({ success: false, message: 'You have not checked in today' });
        }
        if (attendance.checkOut?.time) {
            return res.status(400).json({ success: false, message: 'Already checked out today' });
        }
        const { latitude, longitude, address } = req.body;
        attendance.checkOut = { time: new Date(), latitude, longitude, address: address || '' };
        await attendance.save();
        res.json({ success: true, attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/attendance/today
router.get('/today', protect, async (req, res) => {
    try {
        const today = formatDate(new Date());
        const attendance = await Attendance.findOne({ employee: req.user._id, date: today });
        res.json({ success: true, attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/attendance - Admin: get all, Employee: get own
router.get('/', protect, async (req, res) => {
    try {
        const { startDate, endDate, employeeId, status } = req.query;
        let filter = {};
        if (req.user.role === 'employee') filter.employee = req.user._id;
        if (employeeId && ['admin', 'hr'].includes(req.user.role)) filter.employee = employeeId;
        if (status) filter.status = status;
        if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
        const records = await Attendance.find(filter)
            .populate('employee', 'name email department avatar employeeId')
            .sort({ date: -1 })
            .limit(500);
        res.json({ success: true, count: records.length, records });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/attendance/stats
router.get('/stats', protect, async (req, res) => {
    try {
        const thisMonth = new Date();
        const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
        const today = formatDate(new Date());
        const filter = { date: { $gte: startOfMonth, $lte: today } };
        if (req.user.role === 'employee') filter.employee = req.user._id;

        const records = await Attendance.find(filter);
        const stats = {
            present: records.filter(r => r.status === 'present').length,
            absent: records.filter(r => r.status === 'absent').length,
            late: records.filter(r => r.status === 'late').length,
            total: records.length
        };
        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
