import React, { useEffect, useState } from 'react';
import { Briefcase, CheckCircle, Clock, AlertTriangle, TrendingUp, Users, DollarSign, Bug } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const COLORS = ['#4F9CF9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const STATUS_COLORS = { 'not-started': '#94A3B8', 'in-progress': '#4F9CF9', 'on-hold': '#F59E0B', completed: '#10B981', cancelled: '#EF4444' };

const PMDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [taskStats, setTaskStats] = useState(null);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [projStats, tStats, projList, taskList] = await Promise.all([
                    api.get('/projects/stats').catch(() => ({ data: { stats: {} } })),
                    api.get('/tasks/stats').catch(() => ({ data: { stats: {} } })),
                    api.get('/projects?status=in-progress').catch(() => ({ data: { projects: [] } })),
                    api.get('/tasks?status=in-progress').catch(() => ({ data: { tasks: [] } })),
                ]);
                setStats(projStats.data.stats);
                setTaskStats(tStats.data.stats);
                setProjects(projList.data.projects?.slice(0, 5) || []);
                setTasks(taskList.data.tasks?.slice(0, 5) || []);
            } catch { toast.error('Failed to load dashboard'); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const taskChartData = taskStats ? [
        { name: 'Pending', value: taskStats.pending || 0 },
        { name: 'In Progress', value: taskStats['in-progress'] || 0 },
        { name: 'Review', value: taskStats.review || 0 },
        { name: 'Completed', value: taskStats.completed || 0 },
        { name: 'Rejected', value: taskStats.rejected || 0 },
    ] : [];

    const projectStatusData = stats ? [
        { name: 'Active', value: stats.active || 0, color: '#4F9CF9' },
        { name: 'Completed', value: stats.completed || 0, color: '#10B981' },
        { name: 'On Hold', value: stats.onHold || 0, color: '#F59E0B' },
        { name: 'Delayed', value: stats.delayed || 0, color: '#EF4444' },
    ] : [];

    const budgetUtil = stats?.budget ? Math.round((stats.budget.totalActual / stats.budget.totalBudget) * 100) : 0;

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Project Manager Dashboard</h1>
                <p>Welcome back, {user?.name}  here's your project overview</p>
            </div>

            {/* Stat cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Projects', value: stats?.total ?? '', icon: Briefcase, color: '#4F9CF9' },
                    { label: 'Active Projects', value: stats?.active ?? '', icon: TrendingUp, color: '#10B981' },
                    { label: 'Delayed Projects', value: stats?.delayed ?? '', icon: AlertTriangle, color: '#EF4444' },
                    { label: 'Total Tasks', value: taskStats?.total ?? '', icon: Clock, color: '#8B5CF6' },
                    { label: 'Completed Tasks', value: taskStats?.completed ?? '', icon: CheckCircle, color: '#10B981' },
                    { label: 'Overdue Tasks', value: taskStats?.overdue ?? '', icon: Bug, color: '#EF4444' },
                    { label: 'Budget Used', value: stats?.budget ? `${(stats.budget.totalActual / 1000).toFixed(0)}K` : '', icon: DollarSign, color: '#F59E0B' },
                    { label: 'Team Projects', value: stats?.total ?? '', icon: Users, color: '#06B6D4' },
                ].map((s, i) => (
                    <div key={i} className="card stat-card">
                        <div className="stat-icon" style={{ background: `${s.color}15`, color: s.color }}><s.icon size={20} /></div>
                        <div className="stat-value">{loading ? <div className="skeleton skeleton-text" /> : s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Task status pie */}
                <div className="card">
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Task Status Distribution</h3>
                    {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={taskChartData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                                    {taskChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Project status bar */}
                <div className="card">
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Projects by Status</h3>
                    {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={projectStatusData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {projectStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Budget gauge */}
            {stats?.budget && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Budget Utilization</h3>
                        <span style={{ fontWeight: 700, color: budgetUtil > 90 ? '#EF4444' : budgetUtil > 70 ? '#F59E0B' : '#10B981' }}>{budgetUtil}%</span>
                    </div>
                    <div style={{ background: 'var(--bg-light)', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(budgetUtil, 100)}%`, height: '100%', borderRadius: 8, transition: 'width 0.6s', background: budgetUtil > 90 ? '#EF4444' : budgetUtil > 70 ? '#F59E0B' : 'var(--gradient-primary)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        <span>Actual: {((stats.budget.totalActual || 0) / 1000).toFixed(0)}K</span>
                        <span>Budget: {((stats.budget.totalBudget || 0) / 1000).toFixed(0)}K</span>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Active projects */}
                <div className="card">
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Active Projects</h3>
                    {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="skeleton skeleton-text" style={{ marginBottom: 10 }} />) : (
                        projects.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active projects</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {projects.map(p => (
                                    <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.projectId} · Due {p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                                        </div>
                                        <div style={{ text: 'right' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[p.status] || '#94A3B8', textTransform: 'capitalize', background: `${STATUS_COLORS[p.status]}20`, padding: '2px 8px', borderRadius: 6 }}>{p.status?.replace(/-/g, ' ')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Recent tasks */}
                <div className="card">
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Tasks In Progress</h3>
                    {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="skeleton skeleton-text" style={{ marginBottom: 10 }} />) : (
                        tasks.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tasks in progress</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {tasks.map(t => (
                                    <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.taskId} · {t.assignedTo?.name || 'Unassigned'}</div>
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: t.dueDate && new Date(t.dueDate) < new Date() ? '#EF4444' : '#F59E0B' }}>
                                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default PMDashboard;
