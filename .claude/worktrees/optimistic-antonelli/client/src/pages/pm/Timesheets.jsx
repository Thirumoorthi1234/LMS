import React, { useEffect, useState } from 'react';
import { Plus, Clock, CheckCircle, DollarSign, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Timesheets = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ project: '', task: '', date: new Date().toISOString().split('T')[0], hours: '', description: '', type: 'billable' });
    const [saving, setSaving] = useState(false);
    const [filterProject, setFilterProject] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterProject) params.project = filterProject;
            const { data } = await api.get('/timelogs', { params });
            setLogs(data.logs);
        } catch { toast.error('Failed to load timelogs'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const [p, t] = await Promise.all([api.get('/projects'), api.get('/tasks')]);
                setProjects(p.data.projects || []);
                setTasks(t.data.tasks || []);
            } catch { }
        };
        init(); fetchLogs();
    }, []);
    useEffect(() => { fetchLogs(); }, [filterProject]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.project || !form.hours) { toast.error('Project and hours are required'); return; }
        setSaving(true);
        try {
            await api.post('/timelogs', { ...form, hours: parseFloat(form.hours) });
            toast.success('Time logged!');
            setModal(false);
            setForm({ project: '', task: '', date: new Date().toISOString().split('T')[0], hours: '', description: '', type: 'billable' });
            fetchLogs();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to log time'); }
        finally { setSaving(false); }
    };

    const approveLog = async (id) => {
        try { await api.put(`/timelogs/${id}/approve`); toast.success('Approved!'); fetchLogs(); }
        catch { toast.error('Failed to approve'); }
    };

    const deleteLog = async (id) => {
        if (!confirm('Delete this time log?')) return;
        try { await api.delete(`/timelogs/${id}`); toast.success('Deleted'); fetchLogs(); }
        catch { toast.error('Cannot delete (may be approved)'); }
    };

    const totalHours = logs.reduce((s, l) => s + l.hours, 0);
    const billable = logs.filter(l => l.type === 'billable').reduce((s, l) => s + l.hours, 0);
    const pending = logs.filter(l => !l.isApproved).length;

    const projectTasks = tasks.filter(t => t.project?._id === form.project || t.project === form.project);

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Timesheets</h1>
                <p>Log and manage working hours across projects</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Total Hours', value: totalHours.toFixed(1), icon: Clock, color: '#4F9CF9' },
                    { label: 'Billable Hours', value: billable.toFixed(1), icon: DollarSign, color: '#10B981' },
                    { label: 'Non-Billable', value: (totalHours - billable).toFixed(1), icon: Clock, color: '#F59E0B' },
                    { label: 'Pending Approval', value: pending, icon: CheckCircle, color: '#8B5CF6' },
                ].map((s, i) => (
                    <div key={i} className="card stat-card">
                        <div className="stat-icon" style={{ background: `${s.color}15`, color: s.color }}><s.icon size={20} /></div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="filter-bar">
                <select className="form-control" style={{ width: 220 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Log Hours</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead><tr><th>Date</th><th>Employee</th><th>Project</th><th>Task</th><th>Description</th><th>Hours</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(9).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                logs.length === 0 ? <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Clock size={48} /></div><h3>No time logs yet</h3><p>Start logging your work hours</p></div></td></tr> :
                                    logs.map(log => (
                                        <tr key={log._id}>
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(log.date).toLocaleDateString('en-IN')}</td>
                                            <td style={{ fontSize: 12, fontWeight: 500 }}>{log.user?.name || ''}</td>
                                            <td style={{ fontSize: 12 }}>{log.project?.name || ''}</td>
                                            <td style={{ fontSize: 12 }}>{log.task?.name || ''}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description || ''}</div>
                                            </td>
                                            <td style={{ fontWeight: 700, fontSize: 13 }}>{log.hours}h</td>
                                            <td><span style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize', color: log.type === 'billable' ? '#10B981' : '#94A3B8', background: log.type === 'billable' ? '#ECFDF5' : '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>{log.type}</span></td>
                                            <td>{log.isApproved ? <span className="badge badge-approved"><span className="badge-dot" />Approved</span> : <span className="badge badge-pending"><span className="badge-dot" />Pending</span>}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {(user?.role === 'admin' || user?.role === 'pm') && !log.isApproved && (
                                                        <button className="btn btn-primary btn-sm" onClick={() => approveLog(log._id)} style={{ fontSize: 11 }}> Approve</button>
                                                    )}
                                                    {!log.isApproved && (
                                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteLog(log._id)}></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modal} onClose={() => setModal(false)} title="Log Working Hours" size="md">
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Project</label>
                            <select className="form-control" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value, task: '' }))} required>
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Task</label>
                            <select className="form-control" value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))}>
                                <option value="">General / No specific task</option>
                                {projectTasks.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Date</label>
                            <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Hours</label>
                            <input className="form-control" type="number" step="0.25" min="0.25" max="24" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="2.5" required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                            <option value="billable">Billable</option>
                            <option value="non-billable">Non-Billable</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log Hours'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Timesheets;
