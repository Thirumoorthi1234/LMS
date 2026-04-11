import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MapPin, LogIn, LogOut, AlertCircle } from 'lucide-react';

const Attendance = () => {
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [locError, setLocError] = useState('');
    const [showSuccess, setShowSuccess] = useState('');
    const [history, setHistory] = useState([]);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayKey = new Date().toISOString().split('T')[0];

    const fetchToday = useCallback(async () => {
        try {
            const [todayRes, histRes] = await Promise.all([
                api.get('/attendance/today'),
                api.get('/attendance', { params: { startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], endDate: todayKey } })
            ]);
            setAttendance(todayRes.data.attendance);
            setHistory(histRes.data.records || []);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchToday(); }, []);

    // Get high-precision geolocation (Warm-up strategy for mobile)
    const getLocation = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation not supported by your browser')); return; }
        setLocError('');

        // Check for HTTPS: Geolocation requires a secure origin on mobile/remote access
        if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
            reject(new Error('Location requires HTTPS on mobile. Please use localhost or a secure tunnel (like ngrok).'));
            return;
        }

        let bestPos = null;
        let watchId = null;
        const TARGET_ACCURACY = 80; // Aim for 80 meters or better
        const MAX_WAIT_TIME = 30000; // Allow 30 seconds for GPS sensors to "warm up" and settle

        const clearWatch = () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };

        // Fail-safe timeout: return best position found so far or error
        const timer = setTimeout(() => {
            clearWatch();
            if (bestPos) resolve(bestPos);
            else reject(new Error('Location request timed out. Please ensure GPS is enabled and you have a clear view of the sky.'));
        }, MAX_WAIT_TIME);

        watchId = navigator.geolocation.watchPosition(
            pos => {
                const current = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };

                // Keep the most accurate position found
                if (!bestPos || current.accuracy < bestPos.accuracy) {
                    bestPos = current;
                }

                // If we reach our target accuracy, resolve immediately
                if (current.accuracy <= TARGET_ACCURACY) {
                    clearTimeout(timer);
                    clearWatch();
                    resolve(current);
                }
            },
            err => {
                // Only reject immediately on permission denial
                if (err.code === err.PERMISSION_DENIED) {
                    clearTimeout(timer);
                    clearWatch();
                    reject(new Error('Location access denied. Please allow location in your browser settings.'));
                }
                // For other errors (position unavailable, timeout), we wait for the fallback timer
                console.warn('Geolocation update error:', err.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
    });

    // Reverse Geocode
    const getAddress = async (lat, lng) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'en' }
            });
            const data = await res.json();
            return data.display_name || 'Address not found';
        } catch {
            return 'Address lookup failed';
        }
    };

    const handleCheckIn = async () => {
        setActionLoading(true); setLocError('');
        try {
            const loc = await getLocation();
            const address = await getAddress(loc.latitude, loc.longitude);
            const payload = { ...loc, address };
            setLocation(payload);
            await api.post('/attendance/checkin', payload);
            await fetchToday();
            setShowSuccess('checkin');
            toast.success(' Checked in successfully!');
            setTimeout(() => setShowSuccess(''), 3000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setLocError(msg);
            toast.error(msg);
        } finally { setActionLoading(false); }
    };

    const handleCheckOut = async () => {
        setActionLoading(true); setLocError('');
        try {
            const loc = await getLocation();
            const address = await getAddress(loc.latitude, loc.longitude);
            const payload = { ...loc, address };
            await api.post('/attendance/checkout', payload);
            await fetchToday();
            setShowSuccess('checkout');
            toast.success(' Checked out successfully!');
            setTimeout(() => setShowSuccess(''), 3000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setLocError(msg);
            toast.error(msg);
        } finally { setActionLoading(false); }
    };

    const refreshLocation = async () => {
        setActionLoading(true);
        try {
            const loc = await getLocation();
            const address = await getAddress(loc.latitude, loc.longitude);
            setLocation({ ...loc, address });
            toast.success('Location updated');
        } catch (err) {
            setLocError(`Failed to refine location: ${err.message}`);
        } finally { setActionLoading(false); }
    };

    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const isCheckedIn = !!attendance?.checkIn?.time;
    const isCheckedOut = !!attendance?.checkOut?.time;

    const statusBadge = { present: 'badge-present', absent: 'badge-absent', late: 'badge-late', 'on-leave': 'badge-on-leave' };

    return (
        <div className="fade-in">
            <div className="page-header"><h1>My Attendance</h1><p>{today}</p></div>

            <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
                {/* Check-in/out Card */}
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

                    {/* Success animation */}
                    {showSuccess && (
                        <div className="success-pop" style={{ background: 'var(--secondary-light)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 4 }}>{showSuccess === 'checkin' ? '' : ''}</div>
                            <div style={{ fontWeight: 700, color: 'var(--secondary-dark)' }}>{showSuccess === 'checkin' ? 'Successfully Checked In!' : 'Successfully Checked Out!'}</div>
                            {location?.address && <div style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 4 }}> {location.address}</div>}
                        </div>
                    )}

                    {/* Times */}
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
                                        <span style={{ fontSize: 12, lineHeight: 1.4 }}><strong>Location:</strong> {attendance.checkIn.address}</span>
                                        {attendance.checkIn.accuracy && (
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Accuracy: ±{Math.round(attendance.checkIn.accuracy)}m</span>
                                        )}
                                    </div>
                                </div>
                            ) : attendance.checkIn.latitude && (
                                <div className="location-display">
                                    <MapPin size={16} color="var(--secondary)" />
                                    <span> Location: {attendance.checkIn.latitude.toFixed(4)}°N, {attendance.checkIn.longitude.toFixed(4)}°E</span>
                                </div>
                            )}
                            {attendance.totalHours > 0 && (
                                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    Total hours today: <strong style={{ color: 'var(--primary)' }}>{attendance.totalHours}h</strong>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {locError && (
                        <div style={{ background: 'var(--danger-light)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <AlertCircle size={16} color="var(--danger)" />
                                <span style={{ fontSize: 13, color: 'var(--danger)' }}>{locError}</span>
                            </div>
                            <button onClick={refreshLocation} style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Retry</button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!loading && (
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            {!isCheckedIn && (
                                <button className="btn btn-success btn-lg" onClick={handleCheckIn} disabled={actionLoading} style={{ minWidth: 160 }}>
                                    {actionLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Refining location accuracy...</span> : <><LogIn size={18} /> Check In</>}
                                </button>
                            )}
                            {isCheckedIn && !isCheckedOut && (
                                <button className="btn btn-danger btn-lg" onClick={handleCheckOut} disabled={actionLoading} style={{ minWidth: 160 }}>
                                    {actionLoading ? 'Refining location accuracy...' : <><LogOut size={18} /> Check Out</>}
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

                {/* Stats Card */}
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
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(r.checkIn?.time) || ''}  {fmtTime(r.checkOut?.time) || ''}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How to Check In */}
            {!isCheckedIn && (
                <div className="card" style={{ background: 'var(--primary-light)', border: '1px solid rgba(79,156,249,0.2)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 24 }}></span>
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>How to Check In</div>
                            <p style={{ fontSize: 13, margin: 0, color: 'var(--primary-dark)', opacity: 0.8 }}>
                                Click "Check In" above. Your browser will request location permission  please allow it. Your location will be captured and saved securely with your attendance record.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
