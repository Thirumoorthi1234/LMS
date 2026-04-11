const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, requireRole } = require('../middleware/auth');

// Helper: create notification
const createNotif = async (recipient, title, message, type, relatedId) => {
    await Notification.create({ recipient, title, message, type, relatedId, relatedModel: 'LeaveRequest' });
};

// @GET /api/leaves - Get leaves (admin: all, employee: own)
router.get('/', protect, async (req, res) => {
    try {
        const { status, startDate, endDate, employeeId } = req.query;
        let filter = {};
        if (req.user.role === 'employee') filter.employee = req.user._id;
        if (employeeId && ['admin', 'hr'].includes(req.user.role)) filter.employee = employeeId;
        if (status) filter.status = status;
        if (startDate && endDate) filter.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        const leaves = await LeaveRequest.find(filter)
            .populate('employee', 'name email department avatar employeeId')
            .populate('leaveType', 'name color code')
            .populate('reviewedBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: leaves.length, leaves });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @POST /api/leaves - Apply for leave
router.post('/', protect, requireRole('employee'), async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason, isHalfDay } = req.body;
        const leave = new LeaveRequest({ employee: req.user._id, leaveType, startDate, endDate, reason, isHalfDay: !!isHalfDay });
        await leave.save();
        await leave.populate('leaveType', 'name color code');

        // Notify all admins and HRs
        const reviewers = await User.find({ role: { $in: ['admin', 'hr'] }, isActive: true });
        await Promise.all(reviewers.map(rev =>
            createNotif(rev._id, 'New Leave Request', `${req.user.name} applied for ${leave.leaveType.name} leave`, 'leave_applied', leave._id)
        ));
        res.status(201).json({ success: true, leave });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/leaves/stats/summary - Dashboard stats  ← MUST be before /:id
router.get('/stats/summary', protect, async (req, res) => {
    try {
        const employeeFilter = req.user.role === 'employee' ? { employee: req.user._id } : {};
        const [pending, approved, rejected, total] = await Promise.all([
            LeaveRequest.countDocuments({ ...employeeFilter, status: 'pending' }),
            LeaveRequest.countDocuments({ ...employeeFilter, status: 'approved' }),
            LeaveRequest.countDocuments({ ...employeeFilter, status: 'rejected' }),
            LeaveRequest.countDocuments(employeeFilter)
        ]);
        res.json({ success: true, stats: { pending, approved, rejected, total } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/leaves/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id)
            .populate('employee', 'name email department avatar')
            .populate('leaveType', 'name color code')
            .populate('reviewedBy', 'name');
        if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
        res.json({ success: true, leave });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/leaves/:id/review - Admin/HR: approve or reject
router.put('/:id/review', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { status, adminRemark, startDate, endDate } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
        }
        const leave = await LeaveRequest.findById(req.params.id).populate('leaveType', 'name code');
        if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
        leave.status = status;
        leave.adminRemark = adminRemark || '';
        leave.reviewedBy = req.user._id;
        leave.reviewedAt = new Date();
        if (startDate) leave.startDate = new Date(startDate);
        if (endDate) leave.endDate = new Date(endDate);
        await leave.save();

        // Update leave balance if approved
        if (status === 'approved') {
            const balanceKey = leave.leaveType.code.toLowerCase();
            await User.findByIdAndUpdate(leave.employee, {
                $inc: { [`leaveBalance.${balanceKey}`]: -leave.numberOfDays }
            });
        }

        // Notify employee
        const notifMsg = status === 'approved'
            ? `Your leave request has been approved.${adminRemark ? ' Remark: ' + adminRemark : ''}`
            : `Your leave request has been rejected.${adminRemark ? ' Reason: ' + adminRemark : ''}`;
        await createNotif(leave.employee, `Leave ${status}`, notifMsg, `leave_${status}`, leave._id);

        res.json({ success: true, leave });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/leaves/:id/cancel - Employee: cancel own pending leave
router.put('/:id/cancel', protect, requireRole('employee'), async (req, res) => {
    try {
        const leave = await LeaveRequest.findOne({ _id: req.params.id, employee: req.user._id });
        if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
        if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Can only cancel pending leaves' });
        leave.status = 'cancelled';
        await leave.save();
        res.json({ success: true, message: 'Leave cancelled' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
