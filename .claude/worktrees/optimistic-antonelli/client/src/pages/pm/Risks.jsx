import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LEVEL_META = {
    low: { color: '#10B981', bg: '#ECFDF5', label: 'Low' },
    medium: { color: '#F59E0B', bg: '#FFFBEB', label: 'Medium' },
    high: { color: '#EF4444', bg: '#FEF2F2', label: 'High' }
};
const STATUS_META = {
    identified: { label: 'Identified', color: '#94A3B8' },
    mitigating: { label: 'Mitigating', color: '#F59E0B' },
    resolved: { label: 'Resolved', color: '#10B981' },
    accepted: { label: 'Accepted', color: '#8B5CF6' }
};

const defaultForm = { project: '', description: '', level: 'medium', impact: '', mitigationPlan: '', responsiblePerson: '', status: 'identified' };

const Risks = () => {
    const { user } = useAuth();
    const [risks, setRisks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [filterProject, setFilterProject] = useState('');
    const [filterLevel, setFilterLevel] = useState('');

    const fetchRisks = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterProject) params.project = filterProject;
            if (filterLevel) params.level = filterLevel;
            const { data } = await api.get('/risks', { params });
            setRisks(data.risks);
        } catch { toast.error('Failed to load risks'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const [p, u] = await Promise.all([api.get('/projects'), api.get('/users')]);
                setProjects(p.data.projects || []);
                setUsers(u.data.users || []);
            } catch { }
        };
        init(); fetchRisks();
    }, []);
    useEffect(() => { fetchRisks(); }, [filterProject, filterLevel]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (r) => {
        setForm({ project: r.project?._id || '', description: r.description, level: r.level, impact: r.impact || '', mitigationPlan: r.mitigationPlan || '', responsiblePerson: r.responsiblePerson?._id || '', status: r.status });
        setModal({ open: true, mode: 'edit', item: r });
    };
    const closeModal = () => setModal({ open: false, mode: 'create', item: null });

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.project || !form.description) { toast.error('Project and description are required'); return; }
        setSaving(true);
        try {
            if (modal.mode === 'create') { await api.post('/risks', form); toast.success('Risk added!'); }
            else { await api.put(`/risks/${modal.item._id}`, form); toast.success('Risk updated!'); }
            closeModal(); fetchRisks();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this risk?')) return;
        try { await api.delete(`/risks/${id}`); toast.success('Deleted'); fetchRisks(); }
        catch { toast.error('Delete failed'); }
    };

    const riskCounts = Object.fromEntries(Object.keys(LEVEL_META).map(k => [k, risks.filter(r => r.level === k).length]));

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Risk Management</h1>
                <p>Identify, track, and mitigate project risks</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {Object.entries(LEVEL_META).map(([k, v]) => (
                    <div key={k} className="card stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilterLevel(filterLevel === k ? '' : k)}>
                        <div className="stat-icon" style={{ background: v.bg, color: v.color }}><Shield size={20} /></div>
                        <div className="stat-value" style={{ color: v.color }}>{riskCounts[k] || 0}</div>
                        <div className="stat-label">{v.label} Risk</div>
                    </div>
                ))}
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}><Shield size={20} /></div>
                    <div className="stat-value">{risks.length}</div>
                    <div className="stat-label">Total Risks</div>
                </div>
            </div>

            <div className="filter-bar">
                <select className="form-control" style={{ width: 220 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <select className="form-control" style={{ width: 150 }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                    <option value="">All Levels</option>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Add Risk</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 100 }} />) :
                    risks.length === 0 ? <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><ShieldAlert size={48} /></div><h3>No risks identified</h3><p>Add risks to help manage project health</p></div></div> :
                        risks.map(r => {
                            const lm = LEVEL_META[r.level] || LEVEL_META.medium;
                            const sm = STATUS_META[r.status] || STATUS_META.identified;
                            return (
                                <div key={r._id} className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${lm.color}` }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{r.riskId}</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: lm.color, background: lm.bg, padding: '2px 8px', borderRadius: 6 }}>{lm.label} Risk</span>
                                                <span style={{ fontSize: 11, color: sm.color, fontWeight: 600 }}> {sm.label}</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.project?.name}</span>
                                            </div>
                                            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>{r.description}</p>
                                            {r.impact && <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-secondary)' }}><b>Impact:</b> {r.impact}</p>}
                                            {r.mitigationPlan && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}><b>Mitigation:</b> {r.mitigationPlan}</p>}
                                            {r.responsiblePerson && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Responsible: {r.responsiblePerson.name}</p>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(r)}><Edit size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(r._id)}><Trash2 size={13} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
            </div>

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Add Risk' : 'Edit Risk'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Project</label>
                            <select className="form-control" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} required>
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Risk Level</label>
                            <select className="form-control" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Risk Description</label>
                        <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Impact</label>
                        <textarea className="form-control" rows={2} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} placeholder="What happens if this risk occurs?" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Mitigation Plan</label>
                        <textarea className="form-control" rows={2} value={form.mitigationPlan} onChange={e => setForm(f => ({ ...f, mitigationPlan: e.target.value }))} placeholder="How will you mitigate this risk?" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Responsible Person</label>
                            <select className="form-control" value={form.responsiblePerson} onChange={e => setForm(f => ({ ...f, responsiblePerson: e.target.value }))}>
                                <option value="">Select Person</option>
                                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'create' ? 'Add Risk' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Risks;
