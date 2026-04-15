const express = require('express');
const router = express.Router();
const https = require('https');
const Attendance = require('../models/Attendance');
const { protect, requireRole } = require('../middleware/auth');

// Helper: fetch JSON from external URL via Node https with timeout
const fetchJson = (urlStr, extraHeaders = {}) => new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { 'Accept': 'application/json', ...extraHeaders }
    };
    const req = https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
});

// Helper: format date to YYYY-MM-DD
const formatDate = (d) => new Date(d).toISOString().split('T')[0];

// Fixed Office Coordinates
const OFFICE_LAT = 13.0827; // Replace with actual office latitude
const OFFICE_LNG = 80.2707; // Replace with actual office longitude
const MAX_RADIUS = 100; // Max allowed distance in meters
const MAX_ACCURACY = 150; // Max accuracy in meters

// Helper: Haversine distance formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degree) => degree * (Math.PI / 180);
    const R = 6371e3; // Earth radius in meters
    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaPhi = toRadians(lat2 - lat1);
    const deltaLambda = toRadians(lon2 - lon1);

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
};

// @POST /api/attendance/checkin
router.post('/checkin', protect, requireRole('employee'), async (req, res) => {
    try {
        const today = formatDate(new Date());
        const existing = await Attendance.findOne({ employee: req.user._id, date: today });
        if (existing && existing.checkIn?.time) {
            return res.status(400).json({ success: false, message: 'Already checked in today' });
        }
        const { latitude, longitude, address, accuracy } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Location data is required' });
        }

        if (accuracy && accuracy > MAX_ACCURACY) {
            return res.status(400).json({ success: false, message: `Location accuracy (${Math.round(accuracy)}m) is too low. Must be <= ${MAX_ACCURACY}m.` });
        }

        const distance = calculateDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        if (distance > MAX_RADIUS) {
            return res.status(400).json({ success: false, message: `Check-in denied. You are ${Math.round(distance)}m away from the office. Must be within ${MAX_RADIUS}m.` });
        }

        const attendance = existing
            ? existing
            : new Attendance({ employee: req.user._id, date: today });
        attendance.checkIn = { time: new Date(), latitude, longitude, address: address || '' };
        attendance.status = 'present';
        await attendance.save();
        res.json({ success: true, attendance, distance: Math.round(distance) });
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
        const { latitude, longitude, address, accuracy } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Location data is required' });
        }

        if (accuracy && accuracy > MAX_ACCURACY) {
            return res.status(400).json({ success: false, message: `Location accuracy (${Math.round(accuracy)}m) is too low. Must be <= ${MAX_ACCURACY}m.` });
        }

        const distance = calculateDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        if (distance > MAX_RADIUS) {
            return res.status(400).json({ success: false, message: `Check-out denied. You are ${Math.round(distance)}m away from the office. Must be within ${MAX_RADIUS}m.` });
        }

        attendance.checkOut = { time: new Date(), latitude, longitude, address: address || '' };
        await attendance.save();
        res.json({ success: true, attendance, distance: Math.round(distance) });
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

const https_old_placeholder = null; // removed (moved to top)

const fetchJson_old_placeholder = null; // removed (moved to top)

// @GET /api/attendance/geocode
// Uses OpenStreetMap Nominatim for reverse geocoding
// Falls back to formatted coordinates if OSM is unreachable
router.get('/geocode', protect, async (req, res) => {
    const { lat, lng } = req.query;
    const coordFallback = `${parseFloat(lat).toFixed(5)}°N, ${parseFloat(lng).toFixed(5)}°E`;

    if (!lat || !lng) return res.json({ success: true, address: coordFallback });

    try {
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const data = await fetchJson(osmUrl, {
            'Accept-Language': 'en',
            'User-Agent': 'LMS-Attendance-App/1.0 (contact: admin@company.com)'
        });

        const address = data?.display_name || coordFallback;
        return res.json({ success: true, address });
    } catch {
        // OSM unreachable — return coordinates so UI never shows an error
        return res.json({ success: true, address: coordFallback });
    }
});

module.exports = router;
