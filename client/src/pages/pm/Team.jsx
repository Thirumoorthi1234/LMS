import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ROLE_COLORS = { pm: '#8B5CF6', developer: '#4F9CF9', admin: '#EF4444', hr: '#10B981', employee: '#F59E0B', client: '#06B6D4' };

const Team = () => {
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [u, t] = await Promise.all([api.get('/users'), api.get('/tasks')]);
                setUsers(u.data.users.filter(u => u.isActive));
                setTasks(t.data.tasks || []);
            } catch { toast.error('Failed to load team'); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const filtered = users.filter(u => filterRole ? u.role === filterRole : ['pm', 'developer', 'admin'].includes(u.role));

    const getUserTaskCount = (userId) => tasks.filter(t => t.assignedTo?._id === userId || t.assignedTo === userId).length;
    const getUserActiveCount = (userId) => tasks.filter(t => (t.assignedTo?._id === userId || t.assignedTo === userId) && t.status === 'in-progress').length;

    const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
    const getColor = (name) => Object.values(ROLE_COLORS)[(name?.charCodeAt(0) || 0) % Object.values(ROLE_COLORS).length];

    return (
        <div className="fade-in">
            <div className="page-header"><h1>Team Members</h1><p>View team workload and performance</p></div>

            <div className="filter-bar">
                <select className="form-control" style={{ width: 180 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option><option value="pm">Project Manager</option>
                    <option value="developer">Developer</option>
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {Array(8).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 180 }} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {filtered.map(u => {
                        const taskCount = getUserTaskCount(u._id);
                        const activeCount = getUserActiveCount(u._id);
                        const roleColor = ROLE_COLORS[u.role] || '#94A3B8';
                        return (
                            <div key={u._id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: getColor(u.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                                        {getInitials(u.name)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: roleColor, background: `${roleColor}15`, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{u.role}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span> {u.email}</span>
                                    {u.department && <span> {u.department}</span>}
                                    {u.skills?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                        {u.skills.slice(0, 3).map((s, i) => <span key={i} style={{ fontSize: 10, background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>{s}</span>)}
                                    </div>}
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-light)', borderRadius: 10, padding: '8px 4px' }}>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#4F9CF9' }}>{taskCount}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Tasks</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'center', background: '#ECFDF5', borderRadius: 10, padding: '8px 4px' }}>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>{activeCount}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Active</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'center', background: '#FFFBEB', borderRadius: 10, padding: '8px 4px' }}>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B' }}>{taskCount - activeCount}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Done</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Team;
