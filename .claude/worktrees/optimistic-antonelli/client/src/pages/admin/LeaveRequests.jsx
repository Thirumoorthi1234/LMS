import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Edit, Search, Filter } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const statusColors = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled' };

const LeaveRequests = () => {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [reviewModal, setReviewModal] = useState({ open: false, leave: null, action: null });
    const [remark, setRemark] = useState('');
    const [editDates, setEditDates] = useState({ startDate: '', endDate: '' });
    const [saving, setSaving] = useState(false);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/leaves', { params: filter !== 'all' ? { status: filter } : {} });
            setLeaves(data.leaves);
        } catch { toast.error('Failed to fetch leaves'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLeaves(); }, [filter]);

    const openReview = (leave, action) => {
        setReviewModal({ open: true, leave, action });
        setRemark(leave.adminRemark || '');
        setEditDates({ startDate: leave.startDate?.slice(0, 10) || '', endDate: leave.endDate?.slice(0, 10) || '' });
    };

    const handleReview = async () => {
        setSaving(true);
        try {
            await api.put(`/leaves/${reviewModal.leave._id}/review`, {
                status: reviewModal.action,
                adminRemark: remark,
                ...editDates
            });
            toast.success(`Leave ${reviewModal.action}!`);
            setReviewModal({ open: false, leave: null, action: null });
            fetchLeaves();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    const filters = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>{user?.role === 'hr' ? 'HRMS: Leave Requests' : 'Leave Requests'}</h1>
                <p>{user?.role === 'hr' ? 'Review and manage employee leave applications' : 'Review, approve, or reject employee leave applications'}</p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {filters.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ textTransform: 'capitalize' }}
                    >{f}</button>
                ))}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th><th>Leave Type</th><th>Start Date</th>
                                <th>End Date</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                ))
                            ) : leaves.length === 0 ? (
                                <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FileText size={48} /></div><h3>No {filter} leave requests</h3></div></td></tr>
                            ) : (
                                leaves.map(leave => (
                                    <tr key={leave._id}>
                                        <td>
                                            <div className="table-avatar">
                                                <div className="table-avatar-img">{initials(leave.employee?.name)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{leave.employee?.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{leave.employee?.department}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: leave.leaveType?.color || '#ccc', flexShrink: 0 }} />
                                                {leave.leaveType?.name}
                                            </span>
                                        </td>
                                        <td>{new Date(leave.startDate).toLocaleDateString()}</td>
                                        <td>{new Date(leave.endDate).toLocaleDateString()}</td>
                                        <td><strong>{leave.numberOfDays}</strong></td>
                                        <td style={{ maxWidth: 180 }}><div className="truncate">{leave.reason}</div></td>
                                        <td><span className={`badge ${statusColors[leave.status]}`}><span className="badge-dot" />{leave.status}</span></td>
                                        <td>
                                            {leave.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-success btn-sm btn-icon" onClick={() => openReview(leave, 'approved')} title="Approve"><CheckCircle size={14} /></button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => openReview(leave, 'rejected')} title="Reject"><XCircle size={14} /></button>
                                                </div>
                                            )}
                                            {leave.status !== 'pending' && (
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openReview(leave, leave.status)} title="View/Edit"><Edit size={14} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review Modal */}
            <Modal isOpen={reviewModal.open} onClose={() => setReviewModal({ open: false, leave: null, action: null })} title={`Review Leave Request`} size="md">
                {reviewModal.leave && (
                    <div>
                        <div style={{ background: 'var(--bg-light)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>{reviewModal.leave.employee?.name}</div>
                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: 14 }}>
                                <span><strong>Type:</strong> {reviewModal.leave.leaveType?.name}</span>
                                <span><strong>Days:</strong> {reviewModal.leave.numberOfDays}</span>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 14 }}><strong>Reason:</strong> {reviewModal.leave.reason}</div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Start Date</label>
                                <input type="date" className="form-control" value={editDates.startDate} onChange={e => setEditDates(d => ({ ...d, startDate: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date</label>
                                <input type="date" className="form-control" value={editDates.endDate} onChange={e => setEditDates(d => ({ ...d, endDate: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Admin Remark</label>
                            <textarea className="form-control" rows={3} placeholder="Add a remark (optional)..." value={remark} onChange={e => setRemark(e.target.value)} />
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-secondary" onClick={() => setReviewModal({ open: false, leave: null, action: null })}>Cancel</button>
                            {reviewModal.action !== 'approved' && (
                                <button className="btn btn-success" disabled={saving} onClick={() => { setReviewModal(m => ({ ...m, action: 'approved' })); setTimeout(handleReview, 0); }}>
                                    Approve
                                </button>
                            )}
                            {reviewModal.action !== 'rejected' && (
                                <button className="btn btn-danger" disabled={saving} onClick={() => { setReviewModal(m => ({ ...m, action: 'rejected' })); setTimeout(handleReview, 0); }}>
                                    Reject
                                </button>
                            )}
                            {(reviewModal.action === 'approved' || reviewModal.action === 'rejected') && (
                                <button className="btn btn-primary" disabled={saving} onClick={handleReview}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default LeaveRequests;
