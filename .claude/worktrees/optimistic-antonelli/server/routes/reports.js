const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// Helper: send Excel file
const sendExcel = (res, data, sheetName, filename) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
};

// @GET /api/reports/attendance - Admin/HR: attendance report
router.get('/attendance', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { startDate, endDate, employeeId, format } = req.query;
        let filter = {};
        if (employeeId) filter.employee = employeeId;
        if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };

        const records = await Attendance.find(filter)
            .populate('employee', 'name email department employeeId')
            .sort({ date: -1 });

        const data = records.map(r => ({
            'Employee ID': r.employee?.employeeId || '',
            'Employee Name': r.employee?.name || '',
            'Department': r.employee?.department || '',
            'Date': r.date,
            'Status': r.status,
            'Check In': r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString() : '',
            'Check Out': r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString() : '',
            'Total Hours': r.totalHours,
            'Check In Location': r.checkIn?.latitude ? `${r.checkIn.latitude}, ${r.checkIn.longitude}` : ''
        }));

        if (format === 'excel') {
            return sendExcel(res, data, 'Attendance', `attendance_report_${Date.now()}.xlsx`);
        }
        res.json({ success: true, count: data.length, records: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/reports/leaves - Admin/HR: leave report
router.get('/leaves', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { startDate, endDate, status, format } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (startDate && endDate) filter.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };

        const leaves = await LeaveRequest.find(filter)
            .populate('employee', 'name email department employeeId')
            .populate('leaveType', 'name')
            .sort({ createdAt: -1 });

        const data = leaves.map(l => ({
            'Employee ID': l.employee?.employeeId || '',
            'Employee Name': l.employee?.name || '',
            'Department': l.employee?.department || '',
            'Leave Type': l.leaveType?.name || '',
            'Start Date': new Date(l.startDate).toLocaleDateString(),
            'End Date': new Date(l.endDate).toLocaleDateString(),
            'Days': l.numberOfDays,
            'Status': l.status,
            'Reason': l.reason,
            'Admin Remark': l.adminRemark,
            'Applied On': new Date(l.createdAt).toLocaleDateString()
        }));

        if (format === 'excel') {
            return sendExcel(res, data, 'Leaves', `leave_report_${Date.now()}.xlsx`);
        }
        res.json({ success: true, count: data.length, records: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/reports/summary - Admin/HR: dashboard summary
router.get('/summary', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [totalEmployees, pendingLeaves, approvedLeaves, presentToday, leavesByType] = await Promise.all([
            User.countDocuments({ role: 'employee', isActive: true }),
            LeaveRequest.countDocuments({ status: 'pending' }),
            LeaveRequest.countDocuments({ status: 'approved' }),
            Attendance.countDocuments({ date: today, status: 'present' }),
            LeaveRequest.aggregate([
                { $lookup: { from: 'leavetypes', localField: 'leaveType', foreignField: '_id', as: 'type' } },
                { $unwind: '$type' },
                { $group: { _id: '$type.name', count: { $sum: 1 }, color: { $first: '$type.color' } } },
                { $sort: { count: -1 } }
            ])
        ]);
        res.json({ success: true, summary: { totalEmployees, pendingLeaves, approvedLeaves, presentToday, leavesByType } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/reports/monthly-trend - Admin/HR: monthly leave trend
router.get('/monthly-trend', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const trend = await LeaveRequest.aggregate([
            { $match: { createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
            { $group: { _id: { month: { $month: '$createdAt' }, status: '$status' }, count: { $sum: 1 } } },
            { $sort: { '_id.month': 1 } }
        ]);
        res.json({ success: true, trend });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
