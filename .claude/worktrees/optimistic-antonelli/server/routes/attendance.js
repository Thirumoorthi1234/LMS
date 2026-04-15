const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, requireRole } = require('../middleware/auth');

// ─── CONFIGURATION ─────────────────────────────────────────────────────────────
// Office coordinates — update these to your actual office location
const OFFICE_LOCATION = {
    lat: 13.0827,   // Example: Chennai, India
    lng: 80.2707
};
const GEOFENCE_RADIUS_METERS = 100;  // Max distance from office to allow check-in
const MAX_ACCURACY_METERS = 50;       // Reject location if accuracy exceeds this

// ─── HAVERSINE FORMULA ─────────────────────────────────────────────────────────
// Calculates the great-circle distance between two points on Earth.
// Returns distance in meters.
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper: format date to YYYY-MM-DD
const formatDate = (d) => new Date(d).toISOString().split('T')[0];

// ─── VALIDATE LOCATION ─────────────────────────────────────────────────────────
// Shared validation for check-in and check-out requests.
// Enforces accuracy threshold and geofence radius.
function validateLocation(req) {
    const { latitude, longitude, accuracy } = req.body;

    // Ensure coordinates are present
    if (latitude == null || longitude == null) {
        return { valid: false, status: 400, message: 'Location coordinates are required.' };
    }

    // Ensure accuracy was provided
    if (accuracy == null) {
        return { valid: false, status: 400, message: 'Location accuracy data is required.' };
    }

    // Reject if GPS accuracy is too poor (higher number = less accurate)
    if (accuracy > MAX_ACCURACY_METERS) {
        return {
            valid: false,
            status: 400,
            message: `Location accuracy is too low (±${Math.round(accuracy)}m). Please move to an open area and retry. Required: ±${MAX_ACCURACY_METERS}m or better.`
        };
    }

    // Calculate distance from office using Haversine formula
    const distanceFromOffice = haversineDistance(
        latitude, longitude,
        OFFICE_LOCATION.lat, OFFICE_LOCATION.lng
    );

    const withinGeofence = distanceFromOffice <= GEOFENCE_RADIUS_METERS;

    // Reject check-in if outside the geofence
    if (!withinGeofence) {
        return {
            valid: false,
            status: 403,
            message: `You are ${Math.round(distanceFromOffice)}m from the office. Check-in is only allowed within ${GEOFENCE_RADIUS_METERS}m of the office.`
        };
    }

    return { valid: true, distanceFromOffice, withinGeofence };
}

// ─── CHECK-IN ───────────────────────────────────────────────────────────────────
// @POST /api/attendance/checkin
// Requires: latitude, longitude, accuracy, address (optional)
router.post('/checkin', protect, requireRole('employee'), async (req, res) => {
    try {
        const today = formatDate(new Date());

        // Prevent duplicate check-in
        const existing = await Attendance.findOne({ employee: req.user._id, date: today });
        if (existing && existing.checkIn?.time) {
            return res.status(400).json({ success: false, message: 'Already checked in today' });
        }

        // Validate location accuracy and geofence
        const validation = validateLocation(req);
        if (!validation.valid) {
            return res.status(validation.status).json({ success: false, message: validation.message });
        }

        const { latitude, longitude, accuracy, address } = req.body;

        const attendance = existing
            ? existing
            : new Attendance({ employee: req.user._id, date: today });

        attendance.checkIn = {
            time: new Date(),
            latitude,
            longitude,
            accuracy,
            address: address || '',
            withinGeofence: validation.withinGeofence
        };
        attendance.status = 'present';
        await attendance.save();

        res.json({
            success: true,
            attendance,
            distanceFromOffice: Math.round(validation.distanceFromOffice)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── CHECK-OUT ──────────────────────────────────────────────────────────────────
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

        // Validate location accuracy and geofence
        const validation = validateLocation(req);
        if (!validation.valid) {
            return res.status(validation.status).json({ success: false, message: validation.message });
        }

        const { latitude, longitude, accuracy, address } = req.body;

        attendance.checkOut = {
            time: new Date(),
            latitude,
            longitude,
            accuracy,
            address: address || '',
            withinGeofence: validation.withinGeofence
        };
        await attendance.save();

        res.json({
            success: true,
            attendance,
            distanceFromOffice: Math.round(validation.distanceFromOffice)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET TODAY'S ATTENDANCE ─────────────────────────────────────────────────────
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

// ─── GET ATTENDANCE RECORDS ─────────────────────────────────────────────────────
// @GET /api/attendance — Admin/HR: all records, Employee: own records only
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

// ─── MONTHLY STATS ──────────────────────────────────────────────────────────────
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

// ─── GET OFFICE LOCATION (for frontend geofence display) ───────────────────────
// @GET /api/attendance/office-location
router.get('/office-location', protect, (req, res) => {
    res.json({
        success: true,
        office: OFFICE_LOCATION,
        geofenceRadius: GEOFENCE_RADIUS_METERS,
        maxAccuracy: MAX_ACCURACY_METERS
    });
});

module.exports = router;
