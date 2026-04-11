import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, FileText, Clock, CheckCircle, XCircle, AlertCircle, BarChart2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#4F9CF9', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#F59E0B'];

const AdminDashboard = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [sumRes, trendRes] = await Promise.all([
                    api.get('/reports/summary'),
                    api.get('/reports/monthly-trend')
                ]);
                setSummary(sumRes.data.summary);

                // Process monthly trend data
                const monthMap = {};
                MONTHS.forEach((m, i) => { monthMap[i + 1] = { month: m, approved: 0, pending: 0, rejected: 0 }; });
                trendRes.data.trend.forEach(({ _id, count }) => {
                    if (monthMap[_id.month]) monthMap[_id.month][_id.status] = count;
                });
                setTrend(Object.values(monthMap));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    if (loading) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

    const statCards = [
        { label: 'Total Employees', value: summary?.totalEmployees || 0, icon: Users, color: 'blue', sub: 'Active employees' },
        { label: 'Pending Leaves', value: summary?.pendingLeaves || 0, icon: AlertCircle, color: 'orange', sub: 'Awaiting review' },
        { label: 'Approved Leaves', value: summary?.approvedLeaves || 0, icon: CheckCircle, color: 'green', sub: 'This year' },
        { label: 'Present Today', value: summary?.presentToday || 0, icon: Clock, color: 'purple', sub: 'Checked in today' },
    ];

    const pieData = (summary?.leavesByType || []).map((l, i) => ({
        name: l._id, value: l.count, color: l.color || COLORS[i % COLORS.length]
    }));

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>{user?.role === 'hr' ? 'HR Portal Dashboard' : 'Admin Dashboard'}</h1>
                <p>{user?.role === 'hr' ? 'HRMS Overview and Employee Activity' : "Overview of your organization's leave and attendance activity"}</p>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                {statCards.map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className={`card stat-card ${color}`}>
                        <div className={`stat-icon ${color}`}><Icon size={22} /></div>
                        <div className="stat-value">{value}</div>
                        <div className="stat-label">{label}</div>
                        <div className="stat-change" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
                {/* Monthly Trend Bar Chart */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Monthly Leave Trend</div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                                <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                <Legend />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leave by Type Pie Chart */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Leave by Type</div>
                    </div>
                    <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pieData.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><BarChart2 size={48} /></div><h3>No data yet</h3><p>Leave requests will appear here</p></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Leave by Type Summary Cards */}
            {pieData.length > 0 && (
                <div className="card">
                    <div className="card-header"><div className="card-title">Leave Type Breakdown</div></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {pieData.map((d) => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{d.value} requests</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
