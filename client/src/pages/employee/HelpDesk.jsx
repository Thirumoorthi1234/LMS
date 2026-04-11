import React, { useEffect, useState } from 'react';
import { Plus, MessageCircle, Clock, CheckCircle, AlertCircle, Send, LifeBuoy } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const STATUS_META = {
    open: { badge: 'badge-cancelled', label: 'Open', color: '#EF4444' },
    'in-progress': { badge: 'badge-pending', label: 'In Progress', color: '#F59E0B' },
    resolved: { badge: 'badge-approved', label: 'Resolved', color: '#10B981' },
    closed: { badge: 'badge-approved', label: 'Closed', color: '#94A3B8' }
};
const PRIORITY_COLORS = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };
const CATEGORIES = ['payroll', 'leave', 'attendance', 'documents', 'assets', 'benefits', 'general', 'it', 'other'];

const defaultForm = { subject: '', description: '', category: 'general', priority: 'medium' };

const EmployeeHelpDesk = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false });
    const [viewModal, setViewModal] = useState({ open: false, ticket: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [comment, setComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/helpdesk');
            setTickets(data.tickets);
        } catch { toast.error('Failed to load tickets'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTickets(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject || !form.description) { toast.error('Subject and description are required'); return; }
        setSaving(true);
        try {
            await api.post('/helpdesk', form);
            toast.success('Ticket submitted! HR will respond soon.');
            setModal({ open: false });
            setForm(defaultForm);
            fetchTickets();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
        finally { setSaving(false); }
    };

    const addComment = async () => {
        if (!comment.trim()) return;
        setSendingComment(true);
        try {
            const { data } = await api.put(`/helpdesk/${viewModal.ticket._id}`, { comment });
            setViewModal(v => ({ ...v, ticket: data.ticket }));
            setComment('');
            fetchTickets();
        } catch { toast.error('Failed to send'); }
        finally { setSendingComment(false); }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>HR HelpDesk</h1>
                <p>Submit your HR queries and track responses</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setModal({ open: true }); }}>
                    <Plus size={14} /> Raise a Ticket
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 80 }} />)}
                </div>
            ) : tickets.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><LifeBuoy size={48} /></div><h3>No tickets yet</h3><p>Submit a ticket and HR will respond promptly</p></div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tickets.map(ticket => {
                        const statusMeta = STATUS_META[ticket.status] || STATUS_META.open;
                        return (
                            <div key={ticket._id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' }}
                                onClick={() => { setViewModal({ open: true, ticket }); setComment(''); }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ticket.subject}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{ textTransform: 'capitalize' }}>#{ticket.category}</span>
                                        <span></span>
                                        <span style={{ color: PRIORITY_COLORS[ticket.priority], fontWeight: 600, textTransform: 'capitalize' }}> {ticket.priority}</span>
                                        <span></span>
                                        <span>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
                                        <span></span>
                                        <span><MessageCircle size={11} style={{ display: 'inline' }} /> {ticket.comments?.length || 0}</span>
                                    </div>
                                </div>
                                <span className={`badge ${statusMeta.badge}`}><span className="badge-dot" />{statusMeta.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Submit Ticket Modal */}
            <Modal isOpen={modal.open} onClose={() => setModal({ open: false })} title="Raise a HelpDesk Ticket" size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Subject</label>
                        <input className="form-control" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description of your issue" required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Description</label>
                        <textarea className="form-control" rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Please describe your issue in detail..." required />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setModal({ open: false })}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Ticket'}</button>
                    </div>
                </form>
            </Modal>

            {/* View Ticket Modal */}
            <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, ticket: null })} title="Ticket Details" size="lg">
                {viewModal.ticket && (
                    <div>
                        <div style={{ background: 'var(--bg-light)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{viewModal.ticket.subject}</h3>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', marginBottom: 10 }}>
                                <span>Category: <b style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{viewModal.ticket.category}</b></span>
                                <span>Priority: <b style={{ color: PRIORITY_COLORS[viewModal.ticket.priority], textTransform: 'capitalize' }}>{viewModal.ticket.priority}</b></span>
                                <span>Status: <b style={{ color: STATUS_META[viewModal.ticket.status]?.color }}>{STATUS_META[viewModal.ticket.status]?.label}</b></span>
                            </div>
                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{viewModal.ticket.description}</p>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Conversation ({viewModal.ticket.comments?.length || 0})</div>
                        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                            {(viewModal.ticket.comments || []).length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Awaiting HR response...</p>
                            ) : (
                                viewModal.ticket.comments.map((c, i) => (
                                    <div key={i} style={{ background: 'var(--bg-light)', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${c.by?.role === 'employee' ? '#4F9CF9' : '#10B981'}` }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: c.by?.role === 'employee' ? '#4F9CF9' : '#10B981' }}>
                                            {c.by?.name || 'User'} {c.by?.role !== 'employee' && '(HR)'}
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>{new Date(c.date).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div style={{ fontSize: 13 }}>{c.text}</div>
                                    </div>
                                ))
                            )}
                        </div>
                        {viewModal.ticket.status !== 'closed' && viewModal.ticket.status !== 'resolved' && (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input className="form-control" placeholder="Add a follow-up message..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} />
                                <button className="btn btn-primary" onClick={addComment} disabled={sendingComment || !comment.trim()}><Send size={14} /></button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default EmployeeHelpDesk;
