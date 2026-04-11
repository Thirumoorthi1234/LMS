import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const COLORS = ['#4F9CF9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const Reports = () => {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [issues, setIssues] = useState([]);
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('project');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [p, t, l, iss, r] = await Promise.all([
                    api.get('/projects'), api.get('/tasks'), api.get('/timelogs'),
                    api.get('/issues'), api.get('/risks')
                ]);
                setProjects(p.data.projects || []);
                setTasks(t.data.tasks || []);
                setLogs(l.data.logs || []);
                setIssues(iss.data.issues || []);
                setRisks(r.data.risks || []);
            } catch { toast.error('Failed to load reports'); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    // Project analytics
    const projByStatus = ['not-started', 'in-progress', 'on-hold', 'completed', 'cancelled'].map(s => ({
        name: s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: projects.filter(p => p.status === s).length
    }));
    const projByPriority = ['low', 'medium', 'high', 'critical'].map(p => ({
        name: p.charAt(0).toUpperCase() + p.slice(1),
        value: projects.filter(proj => proj.priority === p).length
    }));

    // Task analytics
    const taskByStatus = ['pending', 'in-progress', 'review', 'completed', 'rejected'].map(s => ({
        name: s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: tasks.filter(t => t.status === s).length
    }));
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed');

    // Resource analytics  hours per user
    const userHoursMap = {};
    logs.forEach(l => { const n = l.user?.name || 'Unknown'; userHoursMap[n] = (userHoursMap[n] || 0) + l.hours; });
    const userHours = Object.entries(userHoursMap).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);

    // Financial
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalActual = projects.reduce((s, p) => s + (p.actualCost || 0), 0);
    const budgetData = projects.filter(p => p.budget > 0).map(p => ({ name: p.name.slice(0, 14), budget: p.budget, actual: p.actualCost || 0 })).slice(0, 8);

    const TABS = ['project', 'task', 'resource', 'financial'];

    return (
        <div className="fade-in">
            <div className="page-header"><h1>Reports & Analytics</h1><p>Comprehensive project and team analytics</p></div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                {TABS.map(t => (
                    <button key={t} className={`btn btn-sm ${activeTab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
                ))}
            </div>

            {loading ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>{Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 250 }} />)}</div> : (

                <>
                    {activeTab === 'project' && (
                        <div>
                            <div className="stats-grid" style={{ marginBottom: 20 }}>
                                {[{ l: 'Total', v: projects.length }, { l: 'Active', v: projects.filter(p => p.status === 'in-progress').length }, { l: 'Completed', v: projects.filter(p => p.status === 'completed').length }, { l: 'Cancelled', v: projects.filter(p => p.status === 'cancelled').length }].map((s, i) => (
                                    <div key={i} className="card stat-card"><div className="stat-value">{s.v}</div><div className="stat-label">{s.l} Projects</div></div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="card"><h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Projects by Status</h3>
                                    <ResponsiveContainer width="100%" height={220}><BarChart data={projByStatus}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#4F9CF9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                                </div>
                                <div className="card"><h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Projects by Priority</h3>
                                    <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={projByPriority} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}:${value}` : ''}>{projByPriority.map((_, i) => <Cell key={i} fill={['#10B981', '#F59E0B', '#F97316', '#EF4444'][i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'task' && (
                        <div>
                            <div className="stats-grid" style={{ marginBottom: 20 }}>
                                {[{ l: 'Total Tasks', v: tasks.length }, { l: 'Completed', v: tasks.filter(t => t.status === 'completed').length }, { l: 'In Progress', v: tasks.filter(t => t.status === 'in-progress').length }, { l: 'Overdue', v: overdueTasks.length }].map((s, i) => (
                                    <div key={i} className="card stat-card"><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div></div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="card"><h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Tasks by Status</h3>
                                    <ResponsiveContainer width="100%" height={220}><BarChart data={taskByStatus}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                                </div>
                                <div className="card"><h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Overdue Tasks ({overdueTasks.length})</h3>
                                    {overdueTasks.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No overdue tasks </p> :
                                        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {overdueTasks.map(t => <div key={t._id} style={{ background: '#FEF2F2', borderRadius: 8, padding: '8px 12px', borderLeft: '3px solid #EF4444' }}>
                                                <div style={{ fontWeight: 600, fontSize: 12 }}>{t.name}</div>
                                                <div style={{ fontSize: 11, color: '#EF4444' }}>Due: {new Date(t.dueDate).toLocaleDateString('en-IN')} · {t.assignedTo?.name || 'Unassigned'}</div>
                                            </div>)}
                                        </div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'resource' && (
                        <div>
                            <div className="stats-grid" style={{ marginBottom: 20 }}>
                                {[{ l: 'Total Hours', v: logs.reduce((s, l) => s + l.hours, 0).toFixed(1) }, { l: 'Billable', v: logs.filter(l => l.type === 'billable').reduce((s, l) => s + l.hours, 0).toFixed(1) }, { l: 'Approved', v: logs.filter(l => l.isApproved).length }, { l: 'Pending', v: logs.filter(l => !l.isApproved).length }].map((s, i) => (
                                    <div key={i} className="card stat-card"><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div></div>
                                ))}
                            </div>
                            <div className="card"><h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Hours Logged per Team Member</h3>
                                <ResponsiveContainer width="100%" height={280}><BarChart data={userHours} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} /><Tooltip /><Bar dataKey="hours" fill="#10B981" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div>
                            <div className="stats-grid" style={{ marginBottom: 20 }}>
                                {[{ l: 'Total Budget', v: `${(totalBudget / 1000).toFixed(0)}K` }, { l: 'Total Actual', v: `${(totalActual / 1000).toFixed(0)}K` }, { l: 'Variance', v: `${((totalBudget - totalActual) / 1000).toFixed(0)}K` }, { l: 'Utilization', v: totalBudget > 0 ? `${Math.round((totalActual / totalBudget) * 100)}%` : '0%' }].map((s, i) => (
                                    <div key={i} className="card stat-card"><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div></div>
                                ))}
                            </div>
                            <div className="card"><h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Budget vs Actual Cost by Project</h3>
                                {budgetData.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No budget data available</p> :
                                    <ResponsiveContainer width="100%" height={280}><BarChart data={budgetData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="budget" fill="#4F9CF9" radius={[6, 6, 0, 0]} name="Budget" /><Bar dataKey="actual" fill="#10B981" radius={[6, 6, 0, 0]} name="Actual" /></BarChart></ResponsiveContainer>}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Reports;
