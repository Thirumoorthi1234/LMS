const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// @GET /api/users - Admin/HR: get users
router.get('/', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const { search, department, isActive } = req.query;
        let filter = {};
        if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
        if (department) filter.department = department;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        const users = await User.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, count: users.length, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @POST /api/users - Admin/HR: create user
router.post('/', protect, requireRole('admin', 'hr'), [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['admin', 'employee', 'hr'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
        const { name, email, password, role, department, position, phone, employeeId, joiningDate, leaveBalance } = req.body;

        // HR restricted: cannot create admins or other HRs
        if (req.user.role === 'hr' && (role === 'admin' || role === 'hr')) {
            return res.status(403).json({ success: false, message: 'HR can only create employee accounts' });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
        const user = await User.create({ name, email, password, role, department, position, phone, employeeId, joiningDate, leaveBalance });
        res.status(201).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/users/:id - Admin/HR: update user
router.put('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

        // HR restricted: cannot update admins
        if (req.user.role === 'hr' && targetUser.role === 'admin') {
            return res.status(403).json({ success: false, message: 'HR cannot modify admin accounts' });
        }

        // HR restricted: cannot promote to admin
        if (req.user.role === 'hr' && req.body.role === 'admin') {
            return res.status(403).json({ success: false, message: 'HR cannot promote users to admin' });
        }

        const { password, ...updateData } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/users/:id/password - Admin/HR: reset password
router.put('/:id/password', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.password = req.body.password;
        await user.save();
        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @DELETE /api/users/:id - Admin/HR: deactivate
router.delete('/:id', protect, requireRole('admin', 'hr'), async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (req.user.role === 'hr' && targetUser?.role === 'admin') {
            return res.status(403).json({ success: false, message: 'HR cannot deactivate admin accounts' });
        }
        await User.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Employee deactivated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/users/:id/profile - Employee: update own profile
router.put('/:id/profile', protect, async (req, res) => {
    try {
        // Only allow updating own profile unless admin
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const allowed = ['name', 'phone', 'department', 'position', 'avatar'];
        const update = {};
        allowed.forEach(field => { if (req.body[field] !== undefined) update[field] = req.body[field]; });
        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @PUT /api/users/:id/password - Employee: change own password (with verification)
// Note: Admin can reset any password without currentPassword (handled by the admin route above)
// This route allows employees to change their own password with currentPassword check
router.put('/:id/change-password', protect, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.params.id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
