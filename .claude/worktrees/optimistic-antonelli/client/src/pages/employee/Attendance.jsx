import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MapPin, LogIn, LogOut, AlertCircle, Shield, Navigation, RefreshCw } from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────
const TARGET_ACCURACY = 50;   // Stop refining once accuracy is ≤50m
const MAX_WAIT_TIME = 30000;  // Allow 30s for GPS warm-up
const HTTPS_REQUIRED_MSG = 'Location requires HTTPS. Please access this app over HTTPS or use localhost for development.';

// ─── HAVERSINE FORMULA (client-side mirror for UI display) ──────────────────────
// Calculates distance in meters between two lat/lng points on Earth's surface.
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const Attendance = () => {
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [locError, setLocError] = useState('');
    const [showSuccess, setShowSuccess] = useState('');
    const [history, setHistory] = useState([]);
    const [officeConfig, setOfficeConfig] = useState(null);  // Office location + geofence config
    const [gpsStatus, setGpsStatus] = useState('');           // Real-time GPS status feedback

    // Ref to track whether component is still mounted (prevent state updates after unmount)
    const mountedRef = useRef(true);
    useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayKey = new Date().toISOString().split('T')[0];

    // ─── FETCH TODAY'S ATTENDANCE + OFFICE CONFIG ───────────────────────────────
    const fetchToday = useCallback(async () => {
        try {
            const [todayRes, histRes, officeRes] = await Promise.all([
                api.get('/attendance/today'),
                api.get('/attendance', {
                    params: {
                        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        endDate: todayKey
                    }
                }),
                api.get('/attendance/office-location')
            ]);
            if (!mountedRef.current) return;
            setAttendance(todayRes.data.attendance);
            setHistory(histRes.data.records || []);
            setOfficeConfig(officeRes.data);
        } catch { }
        finally { if (mountedRef.current) setLoading(false); }
    }, [todayKey]);

    useEffect(() => { fetchToday(); }, [fetchToday]);

    // ─── HTTPS CHECK ────────────────────────────────────────────────────────────
    // Geolocation API requires a secure context (HTTPS) except on localhost.
    const isSecureContext = () => {
        if (window.isSecureContext) return true;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
        return false;
    };

    // ─── HIGH-ACCURACY GEOLOCATION ──────────────────────────────────────────────
    // Uses watchPosition to continuously refine GPS accuracy.
    // Strategy: collect readings for up to 30s, resolve as soon as accuracy ≤50m,
    // or return best reading at timeout. Rejects immediately on permission denial.
    const getLocation = () => new Promise((resolve, reject) => {
        // Step 1: Check secure context
        if (!isSecureContext()) {
            reject(new Error(HTTPS_REQUIRED_MSG));
            return;
        }

        // Step 2: Check browser support
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser. Please use a modern browser like Chrome or Firefox.'));
            return;
        }

        setLocError('');
        setGpsStatus('Requesting location permission...');

        let bestPos = null;
        let watchId = null;

        const clearWatch = () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };

        // Fail-safe timeout: return best position found so far, or error
        const timer = setTimeout(() => {
            clearWatch();
            if (bestPos) {
                setGpsStatus('');
                resolve(bestPos);
            } else {
                setGpsStatus('');
                reject(new Error(
                    'Location request timed out. Please ensure:\n' +
                    '• GPS/Location Services are turned ON\n' +
                    '• You have a clear view of the sky\n' +
                    '• Location permission is granted in browser settings'
                ));
            }
        }, MAX_WAIT_TIME);

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const current = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };

                // Keep the most accurate reading
                if (!bestPos || current.accuracy < bestPos.accuracy) {
                    bestPos = current;
                    if (mountedRef.current) {
                        setGpsStatus(`Refining accuracy... ±${Math.round(current.accuracy)}m`);
                    }
                }

                // Resolve immediately once we hit target accuracy
                if (current.accuracy <= TARGET_ACCURACY) {
                    clearTimeout(timer);
                    clearWatch();
                    if (mountedRef.current) setGpsStatus('');
                    resolve(current);
                }
            },
            (err) => {
                // Handle specific error codes with user-friendly messages
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        clearTimeout(timer);
                        clearWatch();
                        if (mountedRef.current) setGpsStatus('');
                        reject(new Error(
                            'Location permission denied. To fix this:\n' +
                            '1. Click the lock/info icon in your browser address bar\n' +
                            '2. Set Location to "Allow"\n' +
                            '3. Refresh the page and try again'
                        ));
                        break;
                    case err.POSITION_UNAVAILABLE:
                        // GPS might be off — don't reject immediately, wait for fallback timer
                        console.warn('GPS position unavailable, waiting for signal...');
                        if (mountedRef.current) setGpsStatus('Waiting for GPS signal...');
                        break;
                    case err.TIMEOUT:
                        // Individual reading timed out — watchPosition will keep trying
                        console.warn('Individual GPS reading timed out, retrying...');
                        break;
                    default:
                        console.warn('Geolocation error:', err.message);
                }
            },
            {
                enableHighAccuracy: true, // Force GPS hardware (not just Wi-Fi/cell tower)
                maximumAge: 0,            // Never use cached position
                timeout: 20000            // Timeout per individual reading
            }
        );
    });

    // ─── REVERSE GEOCODE ────────────────────────────────────────────────────────
    // Converts lat/lng to a human-readable address using OpenStreetMap Nominatim.
    const getAddress = async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            return data.display_name || 'Address not found';
        } catch {
            return 'Address lookup failed';
        }
    };

    // ─── CHECK-IN HANDLER ───────────────────────────────────────────────────────
    const handleCheckIn = async () => {
        setActionLoading(true);
        setLocError('');
        try {
            const loc = await getLocation();

            // Client-side accuracy check (server also validates)
            if (loc.accuracy > TARGET_ACCURACY) {
                throw new Error(
                    `Location accuracy is too low (±${Math.round(loc.accuracy)}m). ` +
                    `Required: ±${TARGET_ACCURACY}m or better. Move to an open area and retry.`
                );
            }

            // Client-side geofence preview (server is authoritative)
            if (officeConfig) {
                const dist = haversineDistance(
                    loc.latitude, loc.longitude,
                    officeConfig.office.lat, officeConfig.office.lng
                );
                if (dist > officeConfig.geofenceRadius) {
                    throw new Error(
                        `You are ${Math.round(dist)}m from the office. ` +
                        `Check-in is only allowed within ${officeConfig.geofenceRadius}m.`
                    );
                }
            }

            const address = await getAddress(loc.latitude, loc.longitude);
            const payload = { ...loc, address };
            setLocation(payload);

            const res = await api.post('/attendance/checkin', payload);
            await fetchToday();
            setShowSuccess('checkin');
            toast.success('Checked in successfully!');
            setTimeout(() => setShowSuccess(''), 3000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setLocError(msg);
            toast.error(msg);
        } finally {
            setActionLoading(false);
            setGpsStatus('');
        }
    };

    // ─── CHECK-OUT HANDLER ──────────────────────────────────────────────────────
    const handleCheckOut = async () => {
        setActionLoading(true);
        setLocError('');
        try {
            const loc = await getLocation();

            if (loc.accuracy > TARGET_ACCURACY) {
                throw new Error(
                    `Location accuracy is too low (±${Math.round(loc.accuracy)}m). ` +
                    `Required: ±${TARGET_ACCURACY}m or better. Move to an open area and retry.`
                );
            }

            if (officeConfig) {
                const dist = haversineDistance(
                    loc.latitude, loc.longitude,
                    officeConfig.office.lat, officeConfig.office.lng
                );
                if (dist > officeConfig.geofenceRadius) {
                    throw new Error(
                        `You are ${Math.round(dist)}m from the office. ` +
                        `Check-out is only allowed within ${officeConfig.geofenceRadius}m.`
                    );
                }
            }

            const address = await getAddress(loc.latitude, loc.longitude);
            const payload = { ...loc, address };

            await api.post('/attendance/checkout', payload);
            await fetchToday();
            setShowSuccess('checkout');
            toast.success('Checked out successfully!');
            setTimeout(() => setShowSuccess(''), 3000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setLocError(msg);
            toast.error(msg);
        } finally {
            setActionLoading(false);
            setGpsStatus('');
        }
    };

    // ─── REFRESH LOCATION (manual retry) ────────────────────────────────────────
    const refreshLocation = async () => {
        setActionLoading(true);
        setLocError('');
        try {
            const loc = await getLocation();
            const address = await getAddress(loc.latitude, loc.longitude);
            setLocation({ ...loc, address });
            toast.success(`Location updated (±${Math.round(loc.accuracy)}m)`);
        } catch (err) {
            setLocError(err.message);
        } finally {
            setActionLoading(false);
            setGpsStatus('');
        }
    };

    // ─── HELPERS ────────────────────────────────────────────────────────────────
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const isCheckedIn = !!attendance?.checkIn?.time;
    const isCheckedOut = !!attendance?.checkOut?.time;
    const statusBadge = { present: 'badge-present', absent: 'badge-absent', late: 'badge-late', 'on-leave': 'badge-on-leave' };

    // Calculate live distance from office for display
    const liveDistance = (location && officeConfig)
        ? Math.round(haversineDistance(location.latitude, location.longitude, officeConfig.office.lat, officeConfig.office.lng))
        : null;

    return (
        <div className="fade-in">
            <div className="page-header"><h1>My Attendance</h1><p>{today}</p></div>

            <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
                {/* ─── CHECK-IN/OUT CARD ───────────────────────────────────── */}
                <div className="card checkin-card">
                    {/* Status Icon */}
                    <div className={`checkin-status-icon ${isCheckedIn && !isCheckedOut ? 'checked-in' : 'not-checked'}`}>
                        {isCheckedOut ? '' : isCheckedIn ? '' : ''}
                    </div>

                    {/* Live Badge */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <span className={`live-badge ${isCheckedIn && !isCheckedOut ? 'checked-in' : 'not-checked-in'}`}>
                            <span className="live-dot" />
                            {isCheckedOut ? 'Completed for Today' : isCheckedIn ? 'Currently Checked In' : 'Not Checked In'}
                        </span>
                    </div>

                    {/* GPS Status Indicator — shows real-time accuracy refinement */}
                    {gpsStatus && (
                        <div style={{
                            background: 'var(--primary-light)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 14px',
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13
                        }}>
                            <Navigation size={14} style={{ animation: 'spin 2s linear infinite' }} />
                            <span style={{ color: 'var(--primary-dark)' }}>{gpsStatus}</span>
                        </div>
                    )}

                    {/* Geofence Status — shows distance from office */}
                    {officeConfig && location && !isCheckedOut && (
                        <div style={{
                            background: liveDistance <= officeConfig.geofenceRadius ? 'var(--secondary-light)' : 'var(--danger-light)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 14px',
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13
                        }}>
                            <Shield size={14} />
                            <span>
                                {liveDistance <= officeConfig.geofenceRadius
                                    ? `Within office zone (${liveDistance}m away)`
                                    : `Outside office zone (${liveDistance}m away — max ${officeConfig.geofenceRadius}m)`
                                }
                            </span>
                        </div>
                    )}

                    {/* Success animation */}
                    {showSuccess && (
                        <div className="success-pop" style={{ background: 'var(--secondary-light)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 4 }}>{showSuccess === 'checkin' ? '' : ''}</div>
                            <div style={{ fontWeight: 700, color: 'var(--secondary-dark)' }}>
                                {showSuccess === 'checkin' ? 'Successfully Checked In!' : 'Successfully Checked Out!'}
                            </div>
                            {location?.address && (
                                <div style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 4 }}>
                                    <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {location.address}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Times + Location Display */}
                    {isCheckedIn && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--secondary-light)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary-dark)' }}>Check In Time</span>
                                <strong>{fmtTime(attendance.checkIn.time)}</strong>
                            </div>
                            {isCheckedOut && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>Check Out Time</span>
                                    <strong>{fmtTime(attendance.checkOut.time)}</strong>
                                </div>
                            )}
                            {attendance.checkIn.address ? (
                                <div className="location-display" style={{ alignItems: 'flex-start' }}>
                                    <MapPin size={16} color="var(--secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span style={{ fontSize: 12, lineHeight: 1.4 }}>
                                            <strong>Location:</strong> {attendance.checkIn.address}
                                        </span>
                                        {attendance.checkIn.accuracy && (
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                Accuracy: ±{Math.round(attendance.checkIn.accuracy)}m
                                                {attendance.checkIn.withinGeofence != null && (
                                                    <> | Geofence: {attendance.checkIn.withinGeofence ? 'Inside' : 'Outside'}</>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : attendance.checkIn.latitude && (
                                <div className="location-display">
                                    <MapPin size={16} color="var(--secondary)" />
                                    <span>Location: {attendance.checkIn.latitude.toFixed(4)}°N, {attendance.checkIn.longitude.toFixed(4)}°E</span>
                                </div>
                            )}
                            {attendance.totalHours > 0 && (
                                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    Total hours today: <strong style={{ color: 'var(--primary)' }}>{attendance.totalHours}h</strong>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Display — covers permission denied, GPS off, low accuracy, geofence */}
                    {locError && (
                        <div style={{
                            background: 'var(--danger-light)',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: 12
                        }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flex: 1 }}>
                                    <AlertCircle size={16} color="var(--danger)" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: 'var(--danger)', whiteSpace: 'pre-line' }}>{locError}</span>
                                </div>
                                <button
                                    onClick={refreshLocation}
                                    disabled={actionLoading}
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: 'var(--danger)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        flexShrink: 0
                                    }}
                                >
                                    <RefreshCw size={12} /> Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!loading && (
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            {!isCheckedIn && (
                                <button className="btn btn-success btn-lg" onClick={handleCheckIn} disabled={actionLoading} style={{ minWidth: 160 }}>
                                    {actionLoading ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                width: 16, height: 16,
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                            Getting location...
                                        </span>
                                    ) : <><LogIn size={18} /> Check In</>}
                                </button>
                            )}
                            {isCheckedIn && !isCheckedOut && (
                                <button className="btn btn-danger btn-lg" onClick={handleCheckOut} disabled={actionLoading} style={{ minWidth: 160 }}>
                                    {actionLoading ? 'Getting location...' : <><LogOut size={18} /> Check Out</>}
                                </button>
                            )}
                            {isCheckedOut && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}></div>
                                    You're done for today!
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── STATS CARD ──────────────────────────────────────────── */}
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 16 }}>This Month</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                            { label: 'Present Days', value: history.filter(r => r.status === 'present').length, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
                            { label: 'Late Days', value: history.filter(r => r.status === 'late').length, color: 'var(--warning)', bg: 'var(--warning-light)' },
                            { label: 'On Leave', value: history.filter(r => r.status === 'on-leave').length, color: 'var(--primary)', bg: 'var(--primary-light)' },
                            { label: 'Total Days', value: history.length, color: 'var(--purple)', bg: 'var(--purple-light)' },
                        ].map(s => (
                            <div key={s.label} style={{ padding: '16px', background: s.bg, borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginTop: 4, opacity: 0.8 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="divider" />
                    <div className="card-title" style={{ marginBottom: 12, fontSize: '0.9rem' }}>Recent Records</div>
                    {history.slice(0, 5).map(r => (
                        <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>{r.date}</div>
                            <span className={`badge ${statusBadge[r.status] || 'badge-pending'}`}><span className="badge-dot" />{r.status}</span>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(r.checkIn?.time) || ''} — {fmtTime(r.checkOut?.time) || ''}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── HOW-TO + GEOFENCE INFO ──────────────────────────────────── */}
            {!isCheckedIn && (
                <div className="card" style={{ background: 'var(--primary-light)', border: '1px solid rgba(79,156,249,0.2)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 24 }}><Navigation size={24} /></span>
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>How to Check In</div>
                            <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18, color: 'var(--primary-dark)', opacity: 0.8, lineHeight: 1.8 }}>
                                <li>Click <strong>"Check In"</strong> above — your browser will ask for location permission.</li>
                                <li>Allow location access and wait for GPS to lock on (up to 30 seconds).</li>
                                <li>You must be <strong>within {officeConfig?.geofenceRadius || 100}m of the office</strong> to check in.</li>
                                <li>GPS accuracy must be <strong>±{officeConfig?.maxAccuracy || 50}m or better</strong>.</li>
                                <li>For best results, ensure GPS is on and you're near a window or outdoors.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── GOOGLE MAPS INTEGRATION TIP ─────────────────────────────── */}
            {!isCheckedIn && (
                <div className="card" style={{ background: '#FFF7ED', border: '1px solid #FDBA74', marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <MapPin size={20} color="#EA580C" />
                        <div>
                            <div style={{ fontWeight: 700, color: '#9A3412', marginBottom: 4, fontSize: 13 }}>Tip: Better Accuracy with Google Maps</div>
                            <p style={{ fontSize: 12, margin: 0, color: '#9A3412', opacity: 0.8 }}>
                                For improved location accuracy, open Google Maps on your device first and let it lock your position. Then return here to check in. Google Maps uses Wi-Fi positioning and cell tower triangulation to assist GPS.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
