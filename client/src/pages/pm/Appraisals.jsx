import React, { useEffect, useState } from 'react';
import { Eye, CheckCircle, Clock, Users, BarChart2, Award, ClipboardList } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LEVEL_MAP = {
    1: { label: 'Outstanding', short: 'L1', color: '#10B981', bg: '#ECFDF5' },
    2: { label: 'Exceeds Expectations', short: 'L2', color: '#4F9CF9', bg: '#EFF6FF' },
    3: { label: 'Meets Expectations', short: 'L3', color: '#F59E0B', bg: '#FFFBEB' },
    4: { label: 'Needs Improvement', short: 'L4', color: '#EF4444', bg: '#FEF2F2' }
};
const STATUS_META = { draft: { label: 'Draft', color: '#94A3B8' }, submitted: { label: 'Submitted', color: '#F59E0B' }, 'under-review': { label: 'Under Review', color: '#4F9CF9' }, 'hr-review': { label: 'HR Review', color: '#8B5CF6' }, approved: { label: 'Approved', color: '#10B981' }, rejected: { label: 'Rejected', color: '#EF4444' } };

const PMAppraisals = () => {
    const navigate = useNavigate();
    const [appraisals, setAppraisals] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            const [aRes, sRes] = await Promise.all([api.get('/pmappraisals', { params }), api.get('/pmappraisals/stats').catch(() => ({ data: { stats: {} } }))]);
            setAppraisals(aRes.data.appraisals || []);
            setStats(sRes.data.stats);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [filterStatus]);

    const pending = appraisals.filter(a => a.status === 'submitted');
    const completed = appraisals.filter(a => a.status === 'approved');

    const levelData = [1, 2, 3, 4].map(l => ({ name: LEVEL_MAP[l].short, label: LEVEL_MAP[l].label, value: appraisals.filter(a => a.managerReview?.categoryLevel === l).length, color: LEVEL_MAP[l].color }));

    return (
        <div className="fade-in">
            <div className="page-header"><h1>Appraisal Reviews</h1><p>Review and evaluate team performance appraisals</p></div>

            {/* Stat cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Appraisals', value: stats?.total ?? '', icon: BarChart2, color: '#4F9CF9' },
                    { label: 'Pending Review', value: pending.length, icon: Clock, color: '#F59E0B' },
                    { label: 'Completed', value: completed.length, icon: CheckCircle, color: '#10B981' },
                    { label: 'HR Review', value: stats?.hr_review ?? '', icon: Users, color: '#8B5CF6' },
                ].map((s, i) => (
                    <div key={i} className="card stat-card">
                        <div className="stat-icon" style={{ background: `${s.color}15`, color: s.color }}><s.icon size={20} /></div>
                        <div className="stat-value">{loading ? <div className="skeleton skeleton-text" /> : s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div className="card">
                    <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Category Level Distribution</h3>
                    {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart><Pie data={levelData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>{levelData.map((l, i) => <Cell key={i} fill={l.color} />)}</Pie><Tooltip formatter={(v, n, p) => [v, p.payload.label]} /></PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className="card">
                    <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Reviews by Level</h3>
                    {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={levelData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip formatter={(v, n, p) => [v, p.payload.label]} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{levelData.map((l, i) => <Cell key={i} fill={l.color} />)}</Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar" style={{ marginBottom: 16 }}>
                <select className="form-control" style={{ width: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Appraisal Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead><tr><th>Employee</th><th>Period</th><th>Project</th><th>Status</th><th>Category Level</th><th>Submitted</th><th>Action</th></tr></thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                appraisals.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><ClipboardList size={48} /></div><h3>No appraisals found</h3></div></td></tr> :
                                    appraisals.map(a => {
                                        const sm = STATUS_META[a.status] || STATUS_META.submitted;
                                        const lvl = a.managerReview?.categoryLevel;
                                        return (
                                            <tr key={a._id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#4F9CF9', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.employee?.name?.[0] || '?'}</div>
                                                        <div><div style={{ fontWeight: 600, fontSize: 13 }}>{a.employee?.name || ''}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.employee?.position}</div></div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{a.appraisalPeriod || ''}</td>
                                                <td style={{ fontSize: 12 }}>{a.projectName || ''}</td>
                                                <td><span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: `${sm.color}15`, padding: '3px 10px', borderRadius: 6 }}>{sm.label}</span></td>
                                                <td>{lvl ? <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_MAP[lvl]?.color, background: LEVEL_MAP[lvl]?.bg, padding: '3px 10px', borderRadius: 6 }}>{`L${lvl} ${LEVEL_MAP[lvl]?.label}`}</span> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}></span>}</td>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.selfAppraisal?.submittedAt ? new Date(a.selfAppraisal.submittedAt).toLocaleDateString('en-IN') : ''}</td>
                                                <td>
                                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/pm/appraisals/${a._id}`)} disabled={!['submitted', 'under-review', 'hr-review', 'approved'].includes(a.status)}>
                                                        {['submitted', 'under-review'].includes(a.status) ? 'Review' : <><Eye size={13} style={{ display: 'inline', marginRight: 4 }} />View</>}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PMAppraisals;
