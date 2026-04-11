import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Star, Search, Filter } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CRITERIA = ['performance', 'communication', 'teamwork', 'leadership', 'innovation'];
const CRITERIA_LABELS = { performance: ' Performance', communication: ' Communication', teamwork: ' Teamwork', leadership: ' Leadership', innovation: ' Innovation' };

const defaultRatings = { performance: 3, communication: 3, teamwork: 3, leadership: 3, innovation: 3 };
const defaultForm = { employee: '', period: '', ratings: defaultRatings, comments: '', status: 'draft' };

const StarInput = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
            <button
                key={n} type="button"
                onClick={() => onChange(n)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                title={`${n} / 5`}
            >
                <Star size={22} fill={n <= value ? '#F59E0B' : 'none'} color={n <= value ? '#F59E0B' : '#CBD5E1'} />
            </button>
        ))}
        <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>{value} / 5</span>
    </div>
);

const StarDisplay = ({ value }) => (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={13} fill={n <= Math.round(value) ? '#F59E0B' : 'none'} color={n <= Math.round(value) ? '#F59E0B' : '#CBD5E1'} />
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>({Number(value).toFixed(1)})</span>
    </div>
);

const statusBadge = { draft: 'badge-cancelled', submitted: 'badge-pending', acknowledged: 'badge-approved' };

const Appraisal = () => {
    const { user } = useAuth();
    const [appraisals, setAppraisals] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    const fetchAppraisals = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            const { data } = await api.get('/appraisals', { params });
            setAppraisals(data.appraisals);
        } catch { toast.error('Failed to load appraisals'); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/users');
            setEmployees(data.users.filter(u => u.role === 'employee'));
        } catch { }
    };

    useEffect(() => { fetchAppraisals(); fetchEmployees(); }, []);
    useEffect(() => { fetchAppraisals(); }, [filterStatus]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (item) => {
        setForm({
            employee: item.employee?._id || '',
            period: item.period,
            ratings: { ...defaultRatings, ...item.ratings },
            comments: item.comments || '',
            status: item.status
        });
        setModal({ open: true, mode: 'edit', item });
    };
    const closeModal = () => setModal({ open: false, mode: 'create', item: null });

    const handleRating = (criterion, val) => {
        setForm(f => ({ ...f, ratings: { ...f.ratings, [criterion]: val } }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.employee || !form.period) { toast.error('Employee and period are required'); return; }
        setSaving(true);
        try {
            if (modal.mode === 'create') {
                await api.post('/appraisals', form);
                toast.success('Appraisal created!');
            } else {
                await api.put(`/appraisals/${modal.item._id}`, form);
                toast.success('Appraisal updated!');
            }
            closeModal();
            fetchAppraisals();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this appraisal?')) return;
        try { await api.delete(`/appraisals/${id}`); toast.success('Appraisal deleted'); fetchAppraisals(); }
        catch { toast.error('Failed to delete'); }
    };

    const avgRating = (ratings) => {
        const vals = Object.values(ratings || {});
        if (!vals.length) return 0;
        return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Employee Appraisals</h1>
                <p>Manage performance reviews and ratings for your team</p>
            </div>

            <div className="filter-bar">
                <select className="form-control" style={{ width: 170 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="acknowledged">Acknowledged</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> New Appraisal</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: 640 }}>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Period</th>
                                <th>Ratings Breakdown</th>
                                <th>Avg Rating</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                ))
                            ) : appraisals.length === 0 ? (
                                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Star size={48} /></div><h3>No appraisals found</h3><p>Create the first appraisal for your team</p></div></td></tr>
                            ) : (
                                appraisals.map(a => (
                                    <tr key={a._id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{a.employee?.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.employee?.department}</div>
                                        </td>
                                        <td style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{a.period}</td>
                                        <td>
                                            {/* Compact criteria bars */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                                                {CRITERIA.map(c => {
                                                    const val = a.ratings?.[c] || 0;
                                                    const pct = (val / 5) * 100;
                                                    const emoji = { performance: '', communication: '', teamwork: '', leadership: '', innovation: '' }[c];
                                                    return (
                                                        <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontSize: 10, width: 14 }}>{emoji}</span>
                                                            <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', background: val >= 4 ? '#10B981' : val >= 3 ? '#4F9CF9' : '#F59E0B', borderRadius: 3, transition: 'width 0.3s' }} />
                                                            </div>
                                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 20, textAlign: 'right' }}>{val}/5</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#F59E0B', fontSize: 16, whiteSpace: 'nowrap' }}>
                                                <Star size={14} fill="#F59E0B" color="#F59E0B" />
                                                {a.avgRating?.toFixed ? a.avgRating.toFixed(1) : avgRating(a.ratings)}
                                                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>/5</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusBadge[a.status] || 'badge-pending'}`}>
                                                <span className="badge-dot" />{a.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(a)} title="Edit"><Edit size={14} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(a._id)} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Create/Edit Modal */}
            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Create Appraisal' : 'Edit Appraisal'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Employee</label>
                            <select className="form-control" value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} required disabled={modal.mode === 'edit'}>
                                <option value="">Select Employee</option>
                                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}  {emp.department || 'N/A'}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Appraisal Period</label>
                            <input className="form-control" placeholder="e.g. Q1 2025, Annual 2025" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} required />
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-light)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20 }}>
                        <div style={{ fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontSize: 14 }}> Performance Ratings</div>
                        {CRITERIA.map(c => (
                            <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', minWidth: 150 }}>{CRITERIA_LABELS[c]}</span>
                                <StarInput value={form.ratings[c]} onChange={val => handleRating(c, val)} />
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Average Rating</span>
                            <span style={{ fontWeight: 800, fontSize: 18, color: '#F59E0B' }}>
                                {avgRating(form.ratings).toFixed(1)} / 5
                            </span>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="acknowledged">Acknowledged</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Comments / Feedback</label>
                        <textarea className="form-control" rows={3} placeholder="Add reviewer comments or feedback..." value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : (modal.mode === 'create' ? 'Create Appraisal' : 'Save Changes')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Appraisal;
