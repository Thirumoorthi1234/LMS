import React, { useEffect, useState } from 'react';
import { Search, MapPin, Clock } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AttendanceRecords = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.status) params.status = filters.status;
            const { data } = await api.get('/attendance', { params });
            setRecords(data.records);
        } catch { toast.error('Failed to load attendance'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        setFilters(f => ({ ...f, startDate: monthStart, endDate: today }));
    }, []);

    useEffect(() => {
        if (filters.startDate || filters.endDate) fetchRecords();
    }, [filters]);

    const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    const statusBadge = { present: 'badge-present', absent: 'badge-absent', late: 'badge-late', 'on-leave': 'badge-on-leave', 'half-day': 'badge-pending' };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>{user?.role === 'hr' ? 'HRMS: Attendance' : 'Attendance Records'}</h1>
                <p>{user?.role === 'hr' ? 'Track and monitor employee attendance logs' : 'View and filter all employee check-in/check-out records'}</p>
            </div>

            <div className="filter-bar">
                <div className="form-group" style={{ margin: 0 }}>
                    <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
                <div className="form-group" style={{ margin: 0 }}>
                    <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <select className="form-control" style={{ width: 160 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                    <option value="">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="on-leave">On Leave</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th>
                                <th>Hours</th><th>Status</th><th>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(8).fill(0).map((_, i) => (
                                    <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                ))
                            ) : records.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Clock size={48} /></div><h3>No attendance records found</h3></div></td></tr>
                            ) : (
                                records.map(r => (
                                    <tr key={r._id}>
                                        <td>
                                            <div className="table-avatar">
                                                <div className="table-avatar-img">{initials(r.employee?.name)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{r.employee?.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.employee?.department}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.date}</td>
                                        <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>{fmtTime(r.checkIn?.time)}</td>
                                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{fmtTime(r.checkOut?.time)}</td>
                                        <td>{r.totalHours > 0 ? <strong>{r.totalHours}h</strong> : ''}</td>
                                        <td><span className={`badge ${statusBadge[r.status] || 'badge-pending'} `}><span className="badge-dot" />{r.status}</span></td>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, lineHeight: 1.3 }}>
                                            {r.checkIn?.address ? (
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                                                    <span style={{ marginTop: 2 }}></span>
                                                    <span>{r.checkIn.address}</span>
                                                </div>
                                            ) : r.checkIn?.latitude ? (
                                                `${r.checkIn.latitude.toFixed(4)}, ${r.checkIn.longitude.toFixed(4)}`
                                            ) : ''}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceRecords;
