const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payroll = require('../models/Payroll');
const LeaveRequest = require('../models/LeaveRequest');
const { protect, requireRole } = require('../middleware/auth');

// @desc    Generate payroll for all active employees for a month
// @route   POST /api/payroll/generate
// @access  Private/Admin
router.post('/generate', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { month, year } = req.body;
        const users = await User.find({ isActive: true, role: 'employee' });

        const results = [];
        for (const user of users) {
            // Check if already generated
            const existing = await Payroll.findOne({ userId: user._id, month, year });
            if (existing) continue;

            const baseSalary = user.salary?.base || 0;
            const allowances = user.salary?.allowances || { hra: 0, transport: 0, other: 0 };
            const fixedDeductions = user.salary?.deductions || { pf: 0, tax: 0 };

            // Calculate LOP (Loss of Pay)
            // Query approved unpaid leaves for this month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const unpaidLeaves = await LeaveRequest.find({
                user: user._id,
                status: 'approved',
                leaveType: 'unpaid',
                startDate: { $lte: endDate },
                endDate: { $gte: startDate }
            });

            let lopDays = 0;
            unpaidLeaves.forEach(leave => {
                const start = leave.startDate < startDate ? startDate : leave.startDate;
                const end = leave.endDate > endDate ? endDate : leave.endDate;
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                lopDays += days;
            });

            const dailyRate = baseSalary / 30; // Assuming 30 days standard
            const lopAmount = lopDays * dailyRate;

            const totalAllowances = allowances.hra + allowances.transport + allowances.other;
            const totalDeductions = fixedDeductions.pf + fixedDeductions.tax + lopAmount;
            const netSalary = (baseSalary + totalAllowances) - totalDeductions;

            const payroll = await Payroll.create({
                userId: user._id,
                month,
                year,
                baseSalary,
                allowances,
                deductions: { ...fixedDeductions, lop: lopAmount },
                netSalary: netSalary > 0 ? netSalary : 0,
                status: 'Draft'
            });
            results.push(payroll);
        }

        res.status(201).json({ message: 'Payroll generated successfully', count: results.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all payroll records (Admin)
// @route   GET /api/payroll/all
// @access  Private/Admin
router.get('/all', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        if (month) query.month = month;
        if (year) query.year = year;

        const payrolls = await Payroll.find(query)
            .populate('userId', 'name email employeeId department position')
            .sort({ createdAt: -1 });
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get logged in user's payroll records
// @route   GET /api/payroll/my-slips
// @access  Private
router.get('/my-slips', protect, async (req, res) => {
    try {
        const payrolls = await Payroll.find({ userId: req.user._id })
            .sort({ year: -1, month: -1 });
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update payroll status
// @route   PATCH /api/payroll/:id/status
// @access  Private/Admin
router.patch('/:id/status', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { status } = req.body;
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

        payroll.status = status;
        if (status === 'Paid') payroll.paidAt = Date.now();

        await payroll.save();
        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Manually update payroll amounts
// @route   PATCH /api/payroll/:id/amount
// @access  Private/Admin
router.patch('/:id/amount', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { baseSalary, allowances, deductions, netSalary } = req.body;
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

        if (baseSalary !== undefined) payroll.baseSalary = baseSalary;

        if (allowances !== undefined) {
            if (allowances.hra !== undefined) payroll.allowances.hra = allowances.hra;
            if (allowances.transport !== undefined) payroll.allowances.transport = allowances.transport;
            if (allowances.other !== undefined) payroll.allowances.other = allowances.other;
            payroll.markModified('allowances');
        }

        if (deductions !== undefined) {
            if (deductions.pf !== undefined) payroll.deductions.pf = deductions.pf;
            if (deductions.tax !== undefined) payroll.deductions.tax = deductions.tax;
            if (deductions.lop !== undefined) payroll.deductions.lop = deductions.lop;
            payroll.markModified('deductions');
        }

        if (netSalary !== undefined) payroll.netSalary = netSalary;

        await payroll.save();
        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
