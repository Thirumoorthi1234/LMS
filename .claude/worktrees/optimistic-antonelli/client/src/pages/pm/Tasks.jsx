import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, GripVertical, ListTodo } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const COLUMNS = [
    { status: 'pending', label: 'Pending', color: '#94A3B8' },
    { status: 'in-progress', label: 'In Progress', color: '#4F9CF9' },
    { status: 'review', label: 'Review', color: '#8B5CF6' },
    { status: 'completed', label: 'Completed', color: '#10B981' },
    { status: 'rejected', label: 'Rejected', color: '#EF4444' },
];
const PRIORITY_COLORS = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };

const defaultForm = {
    name: '', project: '', assignedTo: '', priority: 'medium',
    startDate: '', dueDate: '', description: '', estimatedHours: '', status: 'pending'
};

const Tasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('kanban');
    const [filterProject, setFilterProject] = useState('');
    const [search, setSearch] = useState('');

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterProject) params.project = filterProject;
            const { data } = await api.get('/tasks', { params });
            setTasks(data.tasks);
        } catch { toast.error('Failed to load tasks'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const [proj, usr] = await Promise.all([api.get('/projects'), api.get('/users')]);
                setProjects(proj.data.projects || []);
                setMembers((usr.data.users || []).filter(u => u.role === 'developer' || u.role === 'pm'));
            } catch { }
        };
        init(); fetchTasks();
    }, []);
    useEffect(() => { fetchTasks(); }, [filterProject]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (t) => {
        setForm({
            name: t.name, project: t.project?._id || '', assignedTo: t.assignedTo?._id || '',
            priority: t.priority, startDate: t.startDate?.split('T')[0] || '',
            dueDate: t.dueDate?.split('T')[0] || '', description: t.description || '',
            estimatedHours: t.estimatedHours || '', status: t.status
        });
        setModal({ open: true, mode: 'edit', item: t });
    };
    const closeModal = () => setModal({ open: false, mode: 'create', item: null });

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name || !form.project) { toast.error('Task name and project are required'); return; }
        setSaving(true);
        try {
            if (modal.mode === 'create') { await api.post('/tasks', form); toast.success('Task created!'); }
            else { await api.put(`/tasks/${modal.item._id}`, form); toast.success('Task updated!'); }
            closeModal(); fetchTasks();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this task?')) return;
        try { await api.delete(`/tasks/${id}`); toast.success('Deleted'); fetchTasks(); }
        catch { toast.error('Delete failed'); }
    };

    const updateStatus = async (task, status) => {
        try { await api.put(`/tasks/${task._id}`, { status }); fetchTasks(); }
        catch { toast.error('Failed to update status'); }
    };

    const filtered = tasks.filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.name?.toLowerCase().includes(q) || t.taskId?.toLowerCase().includes(q) || t.assignedTo?.name?.toLowerCase().includes(q);
    });

    const isOverdue = (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Task Management</h1>
                <p>Track all project tasks across teams</p>
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 200 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-light)', padding: 3, borderRadius: 8 }}>
                    <button className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('kanban')}>Kanban</button>
                    <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('list')}>List</button>
                </div>
                {(user?.role === 'admin' || user?.role === 'pm') && (
                    <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Add Task</button>
                )}
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && (
                <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 14, minWidth: 900 }}>
                        {COLUMNS.map(col => {
                            const colTasks = filtered.filter(t => t.status === col.status);
                            return (
                                <div key={col.status} style={{ flex: '0 0 220px', background: 'var(--bg-light)', borderRadius: 14, padding: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{col.label}</span>
                                        </div>
                                        <span style={{ fontSize: 11, background: `${col.color}20`, color: col.color, padding: '1px 7px', borderRadius: 8, fontWeight: 700 }}>{colTasks.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {loading ? Array(2).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />) :
                                            colTasks.map(t => (
                                                <div key={t._id} style={{ background: 'white', border: `1px solid ${isOverdue(t) ? '#EF444440' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', borderLeft: isOverdue(t) ? '3px solid #EF4444' : `3px solid ${PRIORITY_COLORS[t.priority]}` }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, lineHeight: 1.4 }}>{t.name}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{t.taskId} · {t.project?.name}</div>
                                                    {t.dueDate && <div style={{ fontSize: 10, color: isOverdue(t) ? '#EF4444' : 'var(--text-muted)', marginBottom: 6 }}> {new Date(t.dueDate).toLocaleDateString('en-IN')}</div>}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4F9CF9', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {t.assignedTo?.name?.[0] || '?'}
                                                        </div>
                                                        <span style={{ fontSize: 10, background: `${PRIORITY_COLORS[t.priority]}15`, color: PRIORITY_COLORS[t.priority], padding: '1px 6px', borderRadius: 4, fontWeight: 700, textTransform: 'capitalize' }}>{t.priority}</span>
                                                        {(user?.role === 'admin' || user?.role === 'pm') && (
                                                            <button className="btn btn-secondary btn-sm btn-icon" style={{ width: 20, height: 20, padding: 0 }} onClick={() => openEdit(t)}><Edit size={10} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Task</th><th>Project</th><th>Assigned To</th><th>Priority</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                    filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><ListTodo size={48} /></div><h3>No tasks found</h3></div></td></tr> :
                                        filtered.map(t => (
                                            <tr key={t._id} style={{ background: isOverdue(t) ? '#FEF2F2' : undefined }}>
                                                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.taskId}</div></td>
                                                <td style={{ fontSize: 12 }}>{t.project?.name || ''}</td>
                                                <td style={{ fontSize: 12 }}>{t.assignedTo?.name || 'Unassigned'}</td>
                                                <td><span style={{ fontSize: 12, fontWeight: 700, color: PRIORITY_COLORS[t.priority], textTransform: 'capitalize' }}> {t.priority}</span></td>
                                                <td style={{ fontSize: 12, color: isOverdue(t) ? '#EF4444' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : ''}{isOverdue(t) && ' '}</td>
                                                <td>
                                                    {(user?.role === 'admin' || user?.role === 'pm') ? (
                                                        <select className="form-control" style={{ width: 130, fontSize: 12, padding: '4px 8px' }} value={t.status} onChange={e => updateStatus(t, e.target.value)}>
                                                            {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                                                        </select>
                                                    ) : <span style={{ fontSize: 12, textTransform: 'capitalize', fontWeight: 600 }}>{t.status}</span>}
                                                </td>
                                                <td><div style={{ display: 'flex', gap: 6 }}>
                                                    {(user?.role === 'admin' || user?.role === 'pm') && <>
                                                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(t)}><Edit size={13} /></button>
                                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(t._id)}><Trash2 size={13} /></button>
                                                    </>}
                                                </div></td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Create Task' : 'Edit Task'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Task Name</label>
                            <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Project</label>
                            <select className="form-control" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} required disabled={modal.mode === 'edit'}>
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Assign To</label>
                            <select className="form-control" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                                <option value="">Unassigned</option>
                                {members.map(m => <option key={m._id} value={m._id}>{m.name} ({m.role})</option>)}
                            </select>
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
                            <label className="form-label">Start Date</label>
                            <input className="form-control" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input className="form-control" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Estimated Hours</label>
                            <input className="form-control" type="number" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task description..." />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'create' ? 'Create Task' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Tasks;
