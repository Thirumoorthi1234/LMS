import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, FileText, Clock, CheckCircle, XCircle, AlertCircle, Star, TrendingUp, Award, BarChart2, ClipboardList } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#4F9CF9', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#F59E0B'];
const STATUS_COLORS = { draft: '#94A3B8', submitted: '#4F9CF9', acknowledged: '#10B981' };

const StarRating = ({ value, max = 5 }) => (
    <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: max }).map((_, i) => (
            <Star
                key={i}
                size={14}
                fill={i < Math.round(value) ? '#F59E0B' : 'none'}
                color={i < Math.round(value) ? '#F59E0B' : '#CBD5E1'}
            />
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>({value})</span>
    </div>
);

const HRDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [appraisalStats, setAppraisalStats] = useState(null);
    const [recentAppraisals, setRecentAppraisals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [sumRes, trendRes, appraisalStatsRes, appraisalsRes] = await Promise.all([
                    api.get('/reports/summary'),
                    api.get('/reports/monthly-trend'),
                    api.get('/appraisals/stats'),
                    api.get('/appraisals', { params: {} })
                ]);
                setSummary(sumRes.data.summary);

                const monthMap = {};
                MONTHS.forEach((m, i) => { monthMap[i + 1] = { month: m, approved: 0, pending: 0, rejected: 0 }; });
                trendRes.data.trend.forEach(({ _id, count }) => {
                    if (monthMap[_id.month]) monthMap[_id.month][_id.status] = count;
                });
                setTrend(Object.values(monthMap));
                setAppraisalStats(appraisalStatsRes.data.stats);
                setRecentAppraisals((appraisalsRes.data.appraisals || []).slice(0, 5));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAll();
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

    const appraisalPieData = appraisalStats
        ? Object.entries(appraisalStats.byStatus).map(([k, v]) => ({ name: k, value: v, color: STATUS_COLORS[k] || '#ccc' }))
        : [];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>HR Portal Dashboard</h1>
                <p>HRMS Overview  Employee activity, leaves, and performance appraisals</p>
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
                <div className="card">
                    <div className="card-header"><div className="card-title">Monthly Leave Trend</div></div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                                <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                <Legend />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><div className="card-title">Leave by Type</div></div>
                    <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pieData.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><BarChart2 size={48} /></div><h3>No data yet</h3><p>Leave requests will appear here</p></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
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

            {/* ===== APPRAISAL MODULE ===== */}
            <div className="card" style={{
                marginBottom: '24px',
                border: '2px solid var(--primary-light)',
                background: 'linear-gradient(135deg, rgba(79,156,249,0.04) 0%, rgba(139,92,246,0.04) 100%)',
                overflow: 'visible'  /* override card's overflow:hidden so inner content isn't clipped */
            }}>
                <div className="card-header" style={{ borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F9CF9, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Star size={18} color="white" fill="white" />
                        </div>
                        <div>
                            <div className="card-title" style={{ color: 'var(--primary)' }}>Appraisal Module</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Employee performance reviews and ratings</div>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/hr/appraisals')}>
                        <TrendingUp size={14} /> View All Appraisals
                    </button>
                </div>

                {/* Appraisal Stat Cards */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '20px 0 16px' }}>
                    {[
                        { label: 'Total Appraisals', value: appraisalStats?.total || 0, color: 'var(--primary)' },
                        { label: 'Avg. Rating (/ 5)', value: appraisalStats?.avgRating?.toFixed(1) || '', color: '#F59E0B' },
                        { label: 'Draft', value: appraisalStats?.byStatus?.draft || 0, color: '#94A3B8' },
                        { label: 'Submitted', value: appraisalStats?.byStatus?.submitted || 0, color: '#4F9CF9' },
                        { label: 'Acknowledged', value: appraisalStats?.byStatus?.acknowledged || 0, color: '#10B981' },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ flex: '1 1 140px', background: 'white', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Mini Appraisal Chart + Recent Table */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                    {/* Status Distribution */}
                    <div style={{ flex: '1 1 260px', background: 'white', borderRadius: 'var(--radius)', padding: 16, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)' }}>Status Distribution</div>
                        {appraisalPieData.length === 0 ? (
                            <div className="empty-state" style={{ padding: '20px 0' }}>
                                <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Star size={28} /></div>
                                <p>No appraisals yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={appraisalPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                                        {appraisalPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: 12 }} />
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Recent Appraisals Table */}
                    <div style={{ flex: '1 1 260px', background: 'white', borderRadius: 'var(--radius)', padding: 16, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', minWidth: 0, overflowX: 'auto' }}>
                        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)' }}>Recent Appraisals</div>
                        {recentAppraisals.length === 0 ? (
                            <div className="empty-state" style={{ padding: '20px 0' }}>
                                <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><ClipboardList size={28} /></div>
                                <p>No appraisals yet</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {recentAppraisals.map(a => (
                                    <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.employee?.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.period} · {a.employee?.department}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <StarRating value={a.avgRating} />
                                            <span style={{ fontSize: 11, marginTop: 2, display: 'block' }} className={`badge ${a.status === 'acknowledged' ? 'badge-approved' : a.status === 'submitted' ? 'badge-pending' : 'badge-cancelled'}`}>
                                                {a.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default HRDashboard;
