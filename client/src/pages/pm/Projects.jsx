import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, GripVertical, ListTodo, Briefcase, Calendar, DollarSign, Eye, Users } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUS_META = {
    'not-started': { badge: '#94A3B8', label: 'Not Started' },
    'in-progress': { badge: '#4F9CF9', label: 'In Progress' },
    'on-hold': { badge: '#F59E0B', label: 'On Hold' },
    completed: { badge: '#10B981', label: 'Completed' },
    cancelled: { badge: '#EF4444', label: 'Cancelled' }
};
const PRIORITY_COLORS = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };

const defaultForm = {
    name: '', clientName: '', startDate: '', endDate: '', budget: '',
    priority: 'medium', description: '', status: 'not-started', assignedPM: '', tags: ''
};

const Projects = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterPriority) params.priority = filterPriority;
            const { data } = await api.get('/projects', { params });
            setProjects(data.projects);
        } catch { toast.error('Failed to load projects'); }
        finally { setLoading(false); }
    };
    const fetchUsers = async () => {
        try { const { data } = await api.get('/users'); setUsers(data.users || []); }
        catch { }
    };

    useEffect(() => { fetchProjects(); fetchUsers(); }, []);
    useEffect(() => { fetchProjects(); }, [filterStatus, filterPriority]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (p) => {
        setForm({
            name: p.name, clientName: p.clientName || '', startDate: p.startDate?.split('T')[0] || '',
            endDate: p.endDate?.split('T')[0] || '', budget: p.budget || '', priority: p.priority,
            description: p.description || '', status: p.status, assignedPM: p.assignedPM?._id || '',
            tags: (p.tags || []).join(', ')
        });
        setModal({ open: true, mode: 'edit', item: p });
    };
    const closeModal = () => setModal({ open: false, mode: 'create', item: null });

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name) { toast.error('Project name is required'); return; }
        setSaving(true);
        try {
            const payload = { ...form, budget: parseFloat(form.budget) || 0, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
            if (modal.mode === 'create') { await api.post('/projects', payload); toast.success('Project created!'); }
            else { await api.put(`/projects/${modal.item._id}`, payload); toast.success('Project updated!'); }
            closeModal(); fetchProjects();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this project?')) return;
        try { await api.delete(`/projects/${id}`); toast.success('Project deleted'); fetchProjects(); }
        catch { toast.error('Delete failed'); }
    };

    const filtered = projects.filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.projectId?.toLowerCase().includes(q) || p.clientName?.toLowerCase().includes(q);
    });

    const pmUsers = users.filter(u => u.role === 'pm' || u.role === 'admin');

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Projects</h1>
                <p>Manage all your projects, timelines and team assignments</p>
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 165 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="form-control" style={{ width: 150 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="">All Priority</option>
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="critical">Critical</option>
                </select>
                {(user?.role === 'admin' || user?.role === 'pm') && (
                    <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> New Project</button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {Array(6).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 180 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Briefcase size={48} /></div><h3>No projects found</h3><p>Create your first project to get started</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {filtered.map(p => {
                        const statusMeta = STATUS_META[p.status] || STATUS_META['not-started'];
                        return (
                            <div key={p._id} className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.2s', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = ''}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{p.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.projectId} · {p.clientName || 'Internal'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[p.priority], background: `${PRIORITY_COLORS[p.priority]}15`, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{p.priority}</span>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                                        <span>Progress</span><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.progress || 0}%</span>
                                    </div>
                                    <div style={{ background: 'var(--bg-light)', borderRadius: 4, height: 6 }}>
                                        <div style={{ width: `${p.progress || 0}%`, height: '100%', borderRadius: 4, background: 'var(--gradient-primary)', transition: 'width 0.4s' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                    {p.endDate && <span><Calendar size={12} style={{ display: 'inline', marginRight: 3 }} />{new Date(p.endDate).toLocaleDateString('en-IN')}</span>}
                                    {p.budget > 0 && <span><DollarSign size={12} style={{ display: 'inline' }} />{(p.budget / 1000).toFixed(0)}K</span>}
                                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                                        {(p.team || []).slice(0, 3).map((m, i) => (
                                            <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: '#4F9CF9', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: i > 0 ? -6 : 0, border: '1.5px solid white' }}>
                                                {m.name?.[0] || '?'}
                                            </div>
                                        ))}
                                        {p.team?.length > 3 && <span style={{ fontSize: 10 }}>+{p.team.length - 3}</span>}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: statusMeta.badge, background: `${statusMeta.badge}20`, padding: '3px 10px', borderRadius: 6 }}>{statusMeta.label}</span>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                        <button className="btn btn-secondary btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/pm/projects/${p._id}`); }}><Eye size={13} /></button>
                                        {(user?.role === 'admin' || user?.role === 'pm') && <>
                                            <button className="btn btn-secondary btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Edit size={13} /></button>
                                            {user?.role === 'admin' && <button className="btn btn-danger btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }}><Trash2 size={13} /></button>}
                                        </>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Create New Project' : 'Edit Project'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Project Name</label>
                            <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter project name" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Client Name</label>
                            <input className="form-control" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Client or company name" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input className="form-control" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input className="form-control" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Budget ()</label>
                            <input className="form-control" type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                <option value="low">Low</option><option value="medium">Medium</option>
                                <option value="high">High</option><option value="critical">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Assigned PM</label>
                            <select className="form-control" value={form.assignedPM} onChange={e => setForm(f => ({ ...f, assignedPM: e.target.value }))}>
                                <option value="">Select PM</option>
                                {pmUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Project description..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tags (comma separated)</label>
                        <input className="form-control" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="react, nodejs, api" />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'create' ? 'Create Project' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Projects;
