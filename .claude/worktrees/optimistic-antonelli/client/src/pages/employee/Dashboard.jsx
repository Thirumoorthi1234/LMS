import React, { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, CalendarDays } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [leaveStats, setLeaveStats] = useState(null);
    const [recentLeaves, setRecentLeaves] = useState([]);
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, leavesRes, attRes] = await Promise.all([
                    api.get('/leaves/stats/summary'),
                    api.get('/leaves', { params: {} }),
                    api.get('/attendance/today')
                ]);
                setLeaveStats(statsRes.data.stats);
                setRecentLeaves(leavesRes.data.leaves.slice(0, 5));
                setAttendance(attRes.data.attendance);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    if (loading) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

    const lb = user?.leaveBalance || {};
    const balanceItems = [
        { label: 'Annual', value: lb.annual ?? 0, color: '#4F9CF9', bg: '#EFF6FF' },
        { label: 'Sick', value: lb.sick ?? 0, color: '#F97316', bg: '#FFF7ED' },
        { label: 'Casual', value: lb.casual ?? 0, color: '#10B981', bg: '#ECFDF5' },
        { label: 'Paternity', value: lb.paternity ?? 0, color: '#8B5CF6', bg: '#F5F3FF' },
    ];

    const statusColors = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled' };

    const isCheckedIn = !!attendance?.checkIn?.time;
    const isCheckedOut = !!attendance?.checkOut?.time;

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Welcome, {user?.name?.split(' ')[0]}! </h1>
                <p>Here's your leave and attendance overview</p>
            </div>

            {/* Quick Stats */}
            <div className="stats-grid">
                {[
                    { label: 'Total Applied', value: leaveStats?.total || 0, icon: FileText, color: 'blue' },
                    { label: 'Pending', value: leaveStats?.pending || 0, icon: Clock, color: 'orange' },
                    { label: 'Approved', value: leaveStats?.approved || 0, icon: CheckCircle, color: 'green' },
                    { label: 'Rejected', value: leaveStats?.rejected || 0, icon: XCircle, color: 'purple' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`card stat-card ${color}`}>
                        <div className={`stat-icon ${color}`}><Icon size={20} /></div>
                        <div className="stat-value">{value}</div>
                        <div className="stat-label">{label}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
                {/* Leave Balance */}
                <div className="card">
                    <div className="card-header"><div className="card-title">Leave Balance</div></div>
                    <div className="balance-grid">
                        {balanceItems.map(({ label, value, color, bg }) => (
                            <div key={label} className="balance-card" style={{ borderColor: color, background: bg }}>
                                <div className="balance-num" style={{ color }}>{value}</div>
                                <div className="balance-label" style={{ color }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Today's Attendance */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Today's Attendance</div>
                        <span className={`live-badge ${isCheckedIn && !isCheckedOut ? 'checked-in' : 'not-checked-in'}`}>
                            <span className="live-dot" />
                            {isCheckedIn && !isCheckedOut ? 'Checked In' : isCheckedOut ? 'Checked Out' : 'Not Checked In'}
                        </span>
                    </div>
                    {isCheckedIn ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--secondary-light)', borderRadius: 'var(--radius-sm)' }}>
                                <span style={{ fontSize: 13, color: 'var(--secondary-dark)', fontWeight: 600 }}>Check In</span>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(attendance.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {isCheckedOut && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)' }}>
                                    <span style={{ fontSize: 13, color: '#991B1B', fontWeight: 600 }}>Check Out</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(attendance.checkOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}
                            {attendance.totalHours > 0 && (
                                <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                                    Total Hours: <strong>{attendance.totalHours}h</strong>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}><Clock size={48} /></div>
                            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>You haven't checked in yet today</p>
                            <button className="btn btn-success" onClick={() => navigate('/employee/attendance')}>Go to Attendance</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Leave Requests */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title">Recent Leave Requests</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/employee/leave-history')}>View All</button>
                </div>
                {recentLeaves.length === 0 ? (
                    <div className="empty-state" style={{ padding: '32px' }}>
                        <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FileText size={48} /></div>
                        <h3>No leave requests yet</h3>
                        <p>Apply for your first leave below</p>
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/employee/apply-leave')}>Apply for Leave</button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
                            <tbody>
                                {recentLeaves.map(l => (
                                    <tr key={l._id}>
                                        <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.leaveType?.color || '#ccc', flexShrink: 0 }} />
                                            {l.leaveType?.name}
                                        </td>
                                        <td>{new Date(l.startDate).toLocaleDateString()}</td>
                                        <td>{new Date(l.endDate).toLocaleDateString()}</td>
                                        <td><strong>{l.numberOfDays}</strong></td>
                                        <td><span className={`badge ${statusColors[l.status]}`}><span className="badge-dot" />{l.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeDashboard;
