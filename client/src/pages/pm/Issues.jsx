import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Bug } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SEV_META = {
    low: { color: '#10B981', bg: '#ECFDF5' }, medium: { color: '#F59E0B', bg: '#FFFBEB' },
    high: { color: '#F97316', bg: '#FFF7ED' }, critical: { color: '#EF4444', bg: '#FEF2F2' }
};
const STATUS_OPTS = [{ v: 'open', l: 'Open' }, { v: 'in-progress', l: 'In Progress' }, { v: 'fixed', l: 'Fixed' }, { v: 'closed', l: 'Closed' }, { v: 'rejected', l: 'Rejected' }];
const STATUS_BADGE = { open: 'badge-cancelled', 'in-progress': 'badge-pending', fixed: 'badge-approved', closed: 'badge-approved', rejected: 'badge-cancelled' };
const defaultForm = { project: '', title: '', description: '', severity: 'medium', assignedTo: '', status: 'open' };

const Issues = () => {
    const { user } = useAuth();
    const [issues, setIssues] = useState([]);
    const [projects, setProjects] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [filterProject, setFilterProject] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterProject) params.project = filterProject;
            if (filterSeverity) params.severity = filterSeverity;
            if (filterStatus) params.status = filterStatus;
            const { data } = await api.get('/issues', { params });
            setIssues(data.issues);
        } catch { toast.error('Failed to load issues'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const init = async () => {
            const [p, u] = await Promise.all([api.get('/projects').catch(() => ({ data: { projects: [] } })), api.get('/users').catch(() => ({ data: { users: [] } }))]);
            setProjects(p.data.projects || []);
            setMembers((u.data.users || []).filter(u => u.role !== 'client'));
        };
        init(); fetchIssues();
    }, []);
    useEffect(() => { fetchIssues(); }, [filterProject, filterSeverity, filterStatus]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (issue) => {
        setForm({ project: issue.project?._id || '', title: issue.title, description: issue.description || '', severity: issue.severity, assignedTo: issue.assignedTo?._id || '', status: issue.status });
        setModal({ open: true, mode: 'edit', item: issue });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modal.mode === 'create') { await api.post('/issues', form); toast.success('Issue reported!'); }
            else { await api.put(`/issues/${modal.item._id}`, form); toast.success('Issue updated!'); }
            setModal({ open: false, mode: 'create', item: null }); fetchIssues();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete?')) return;
        try { await api.delete(`/issues/${id}`); toast.success('Deleted'); fetchIssues(); }
        catch { toast.error('Delete failed'); }
    };

    return (
        <div className="fade-in">
            <div className="page-header"><h1>Issue / Bug Tracker</h1><p>Track, assign, and resolve project bugs</p></div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {Object.entries(SEV_META).map(([k, v]) => (
                    <div key={k} className="card stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilterSeverity(filterSeverity === k ? '' : k)}>
                        <div className="stat-icon" style={{ background: v.bg, color: v.color }}><Bug size={20} /></div>
                        <div className="stat-value" style={{ color: v.color }}>{issues.filter(i => i.severity === k).length}</div>
                        <div className="stat-label" style={{ textTransform: 'capitalize' }}>{k}</div>
                    </div>
                ))}
            </div>

            <div className="filter-bar">
                <select className="form-control" style={{ width: 200 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                    <option value="">All Projects</option>{projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <select className="form-control" style={{ width: 145 }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                    <option value="">All Severity</option>{Object.keys(SEV_META).map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                </select>
                <select className="form-control" style={{ width: 145 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>{STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Report Issue</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead><tr><th>Issue</th><th>Project</th><th>Severity</th><th>Assigned To</th><th>Reported By</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                issues.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Bug size={48} /></div><h3>No issues found</h3></div></td></tr> :
                                    issues.map(issue => {
                                        const sm = SEV_META[issue.severity] || SEV_META.medium;
                                        return (
                                            <tr key={issue._id}>
                                                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{issue.title}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{issue.issueId}</div></td>
                                                <td style={{ fontSize: 12 }}>{issue.project?.name || ''}</td>
                                                <td><span style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize', color: sm.color, background: sm.bg, padding: '2px 8px', borderRadius: 6 }}>{issue.severity}</span></td>
                                                <td style={{ fontSize: 12 }}>{issue.assignedTo?.name || 'Unassigned'}</td>
                                                <td style={{ fontSize: 12 }}>{issue.reportedBy?.name || ''}</td>
                                                <td><span className={`badge ${STATUS_BADGE[issue.status] || 'badge-pending'}`}><span className="badge-dot" />{STATUS_OPTS.find(s => s.v === issue.status)?.l || issue.status}</span></td>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(issue.createdAt).toLocaleDateString('en-IN')}</td>
                                                <td><div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(issue)}><Edit size={13} /></button>
                                                    {(user?.role === 'admin' || user?.role === 'pm') && <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(issue._id)}><Trash2 size={13} /></button>}
                                                </div></td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modal.open} onClose={() => setModal({ open: false, mode: 'create', item: null })} title={modal.mode === 'create' ? 'Report Issue' : 'Edit Issue'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-group"><label className="form-label required">Title</label>
                        <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Project</label>
                            <select className="form-control" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} required>
                                <option value="">Select</option>{projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select></div>
                        <div className="form-group"><label className="form-label">Severity</label>
                            <select className="form-control" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                                {Object.keys(SEV_META).map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                            </select></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Assign To</label>
                            <select className="form-control" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                                <option value="">Unassigned</option>{members.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                            </select></div>
                        <div className="form-group"><label className="form-label">Status</label>
                            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                {STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                            </select></div>
                    </div>
                    <div className="form-group"><label className="form-label">Description</label>
                        <textarea className="form-control" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setModal({ open: false, mode: 'create', item: null })}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'create' ? 'Report Issue' : 'Update'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Issues;
