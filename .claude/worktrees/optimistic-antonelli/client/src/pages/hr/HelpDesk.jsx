import React, { useEffect, useState } from 'react';
import { Search, MessageCircle, CheckCircle, Clock, AlertCircle, LifeBuoy } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_META = {
    open: { badge: 'badge-cancelled', label: 'Open', icon: AlertCircle, color: '#EF4444' },
    'in-progress': { badge: 'badge-pending', label: 'In Progress', icon: Clock, color: '#F59E0B' },
    resolved: { badge: 'badge-approved', label: 'Resolved', icon: CheckCircle, color: '#10B981' },
    closed: { badge: 'badge-approved', label: 'Closed', icon: CheckCircle, color: '#94A3B8' }
};
const PRIORITY_COLORS = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };
const CATEGORIES = ['payroll', 'leave', 'attendance', 'documents', 'assets', 'benefits', 'general', 'it', 'other'];

const HRHelpDesk = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewModal, setViewModal] = useState({ open: false, ticket: null });
    const [comment, setComment] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [search, setSearch] = useState('');
    const [employees, setEmployees] = useState([]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterPriority) params.priority = filterPriority;
            const { data } = await api.get('/helpdesk', { params });
            setTickets(data.tickets);
        } catch { toast.error('Failed to load tickets'); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/users');
            setEmployees(data.users.filter(u => u.role === 'hr' || u.role === 'admin'));
        } catch { }
    };

    useEffect(() => { fetchTickets(); fetchEmployees(); }, []);
    useEffect(() => { fetchTickets(); }, [filterStatus, filterPriority]);

    const updateStatus = async (ticket, status) => {
        try {
            await api.put(`/helpdesk/${ticket._id}`, { status });
            toast.success('Status updated');
            fetchTickets();
            if (viewModal.ticket?._id === ticket._id) {
                setViewModal(v => ({ ...v, ticket: { ...v.ticket, status } }));
            }
        } catch { toast.error('Failed to update'); }
    };

    const addComment = async () => {
        if (!comment.trim()) return;
        setSavingComment(true);
        try {
            const { data } = await api.put(`/helpdesk/${viewModal.ticket._id}`, { comment });
            setViewModal(v => ({ ...v, ticket: data.ticket }));
            setComment('');
            fetchTickets();
        } catch { toast.error('Failed to add comment'); }
        finally { setSavingComment(false); }
    };

    const filtered = tickets.filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.subject?.toLowerCase().includes(q) || t.submittedBy?.name?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>HR HelpDesk</h1>
                <p>Manage and resolve employee support tickets</p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {Object.entries(STATUS_META).map(([k, v]) => {
                    const Icon = v.icon;
                    const count = tickets.filter(t => t.status === k).length;
                    return (
                        <div key={k} className="card stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus(filterStatus === k ? '' : k)}>
                            <div className="stat-icon" style={{ background: `${v.color}15`, color: v.color }}><Icon size={20} /></div>
                            <div className="stat-value" style={{ color: v.color }}>{count}</div>
                            <div className="stat-label">{v.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="form-control" style={{ width: 150 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Category</th>
                                <th>Submitted By</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>)
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><LifeBuoy size={48} /></div><h3>No tickets found</h3><p>Employees can submit helpdesk requests from their portal</p></div></td></tr>
                            ) : (
                                filtered.map(ticket => {
                                    const statusMeta = STATUS_META[ticket.status] || STATUS_META.open;
                                    return (
                                        <tr key={ticket._id}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{ticket.subject}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ticket.comments?.length || 0} comment(s)</div>
                                            </td>
                                            <td><span style={{ textTransform: 'capitalize', fontSize: 12, background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>{ticket.category}</span></td>
                                            <td>
                                                <div style={{ fontWeight: 500, fontSize: 13 }}>{ticket.submittedBy?.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ticket.submittedBy?.department}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[ticket.priority] || '#94A3B8', textTransform: 'capitalize' }}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td><span className={`badge ${statusMeta.badge}`}><span className="badge-dot" />{statusMeta.label}</span></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</td>
                                            <td>
                                                <button className="btn btn-primary btn-sm" onClick={() => { setViewModal({ open: true, ticket }); setComment(''); }}>
                                                    <MessageCircle size={13} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, ticket: null })} title="Ticket Details" size="lg">
                {viewModal.ticket && (
                    <div>
                        <div style={{ background: 'var(--bg-light)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                    <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{viewModal.ticket.subject}</h3>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                        <span>By: <b style={{ color: 'var(--text-secondary)' }}>{viewModal.ticket.submittedBy?.name}</b></span>
                                        <span>Category: <b style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{viewModal.ticket.category}</b></span>
                                        <span>Priority: <b style={{ color: PRIORITY_COLORS[viewModal.ticket.priority], textTransform: 'capitalize' }}>{viewModal.ticket.priority}</b></span>
                                    </div>
                                </div>
                                <select className="form-control" style={{ width: 160 }} value={viewModal.ticket.status} onChange={e => updateStatus(viewModal.ticket, e.target.value)}>
                                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>{viewModal.ticket.description}</p>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Comments ({viewModal.ticket.comments?.length || 0})</div>
                        <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                            {(viewModal.ticket.comments || []).length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No comments yet.</p>
                            ) : (
                                (viewModal.ticket.comments || []).map((c, i) => (
                                    <div key={i} style={{ background: 'var(--bg-light)', borderRadius: 8, padding: '10px 14px' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>{c.by?.name || 'User'} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {new Date(c.date).toLocaleString('en-IN')}</span></div>
                                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.text}</div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <textarea className="form-control" rows={2} placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} style={{ flex: 1, resize: 'none' }} />
                            <button className="btn btn-primary" onClick={addComment} disabled={savingComment || !comment.trim()}>{savingComment ? '...' : 'Send'}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default HRHelpDesk;
