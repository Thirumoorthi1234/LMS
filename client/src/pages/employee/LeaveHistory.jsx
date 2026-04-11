import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Search, Filter, Download, Info, History, XCircle } from 'lucide-react';

const statusColors = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled' };

const LeaveHistory = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const { data } = await api.get('/leaves', { params });
            setLeaves(data.leaves);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLeaves(); }, [filter]);

    const handleCancel = async (id) => {
        if (!confirm('Cancel this leave request?')) return;
        try { await api.put(`/leaves/${id}/cancel`); toast.success('Leave cancelled'); fetchLeaves(); }
        catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    };

    const filters = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

    return (
        <div className="fade-in">
            <div className="page-header"><h1>Leave History</h1><p>Track all your leave requests and their status</p></div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {filters.map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>{f}</button>
                ))}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead><tr><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Remark</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                leaves.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><History size={48} /></div><h3>No leaves found</h3></div></td></tr> :
                                    leaves.map(l => (
                                        <tr key={l._id}>
                                            <td>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.leaveType?.color || '#ccc' }} />
                                                    {l.leaveType?.name}
                                                </span>
                                            </td>
                                            <td>{new Date(l.startDate).toLocaleDateString()}</td>
                                            <td>{new Date(l.endDate).toLocaleDateString()}</td>
                                            <td><strong>{l.numberOfDays}</strong></td>
                                            <td style={{ maxWidth: 180 }}><div className="truncate" title={l.reason}>{l.reason}</div></td>
                                            <td><span className={`badge ${statusColors[l.status]}`}><span className="badge-dot" />{l.status}</span></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160 }}>
                                                <div className="truncate" title={l.adminRemark}>{l.adminRemark || ''}</div>
                                            </td>
                                            <td>
                                                {l.status === 'pending' && (
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleCancel(l._id)} title="Cancel"><XCircle size={14} /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LeaveHistory;
