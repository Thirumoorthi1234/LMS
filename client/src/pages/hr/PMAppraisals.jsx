import React, { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle, XCircle, X, Search, Clock, Award, TrendingUp } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const LEVEL_MAP = {
    1: { label: 'Outstanding', color: '#10B981', bg: '#ECFDF5' },
    2: { label: 'Exceeds Expectations', color: '#4F9CF9', bg: '#EFF6FF' },
    3: { label: 'Meets Expectations', color: '#F59E0B', bg: '#FFFBEB' },
    4: { label: 'Needs Improvement', color: '#EF4444', bg: '#FEF2F2' }
};
const STATUS_META = { draft: { label: 'Draft', color: '#94A3B8' }, submitted: { label: 'Submitted', color: '#F59E0B' }, 'under-review': { label: 'Under Review', color: '#4F9CF9' }, 'hr-review': { label: 'HR Review', color: '#8B5CF6' }, approved: { label: 'Approved', color: '#10B981' }, rejected: { label: 'Rejected', color: '#EF4444' } };

const HRPMAppraisals = () => {
    const [appraisals, setAppraisals] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [hrForm, setHrForm] = useState({ finalCategoryLevel: null, hrRemarks: '' });
    const [processing, setProcessing] = useState(false);

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

    const openModal = (a) => {
        setSelected(a);
        setHrForm({ finalCategoryLevel: a.hrReview?.finalCategoryLevel || a.managerReview?.categoryLevel || null, hrRemarks: a.hrReview?.hrRemarks || '' });
    };

    const handleApprove = async () => {
        if (!hrForm.finalCategoryLevel) { toast.error('Select final category level'); return; }
        setProcessing(true);
        try {
            await api.post(`/pmappraisals/${selected._id}/approve`, hrForm);
            toast.success('Appraisal approved!');
            setSelected(null);
            fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setProcessing(false); }
    };

    const handleReject = async () => {
        if (!confirm('Reject this appraisal?')) return;
        setProcessing(true);
        try {
            await api.post(`/pmappraisals/${selected._id}/reject`, { reason: hrForm.hrRemarks || 'Rejected by HR' });
            toast.success('Appraisal rejected');
            setSelected(null);
            fetchData();
        } catch { toast.error('Failed'); }
        finally { setProcessing(false); }
    };

    const levelCounts = [1, 2, 3, 4].map(l => appraisals.filter(a => (a.hrReview?.finalCategoryLevel || a.managerReview?.categoryLevel) === l).length);

    return (
        <div className="fade-in">
            <div className="page-header"><h1>PM Appraisal Records</h1><p>Final review and approval of all performance appraisals</p></div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total', value: stats?.total ?? '', color: '#4F9CF9' },
                    { label: 'Pending HR Review', value: stats?.hr_review ?? '', color: '#8B5CF6' },
                    { label: 'Approved', value: stats?.approved ?? '', color: '#10B981' },
                    { label: 'Rejected', value: stats?.rejected ?? '', color: '#EF4444' },
                ].map((s, i) => (
                    <div key={i} className="card stat-card"><div className="stat-value" style={{ color: s.color }}>{loading ? '...' : s.value}</div><div className="stat-label">{s.label}</div></div>
                ))}
            </div>

            {/* Category distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[1, 2, 3, 4].map(l => (
                    <div key={l} className="card" style={{ textAlign: 'center', padding: '16px 12px', border: `1.5px solid ${LEVEL_MAP[l].color}30` }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: LEVEL_MAP[l].color }}>{loading ? '...' : levelCounts[l - 1]}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: LEVEL_MAP[l].color }}>Level {l}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{LEVEL_MAP[l].label}</div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="filter-bar" style={{ marginBottom: 16 }}>
                <select className="form-control" style={{ width: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead><tr><th>ID</th><th>Employee</th><th>Period</th><th>Project</th><th>Status</th><th>Mgr Level</th><th>Final Level</th><th>Promotion</th><th>Action</th></tr></thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(9).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                appraisals.length === 0 ? <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><ClipboardList size={48} /></div><h3>No appraisals</h3></div></td></tr> :
                                    appraisals.map(a => {
                                        const sm = STATUS_META[a.status];
                                        const mgrL = a.managerReview?.categoryLevel;
                                        const finalL = a.hrReview?.finalCategoryLevel;
                                        return (
                                            <tr key={a._id}>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.appraisalId}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.employee?.name || ''}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.employee?.department}</div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{a.appraisalPeriod || ''}</td>
                                                <td style={{ fontSize: 12 }}>{a.projectName || ''}</td>
                                                <td><span style={{ fontSize: 11, fontWeight: 700, color: sm?.color, background: `${sm?.color}18`, padding: '3px 8px', borderRadius: 6 }}>{sm?.label}</span></td>
                                                <td>{mgrL ? <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_MAP[mgrL]?.color }}>{`L${mgrL} ${LEVEL_MAP[mgrL]?.label}`}</span> : ''}</td>
                                                <td>{finalL ? <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_MAP[finalL]?.color, background: LEVEL_MAP[finalL]?.bg, padding: '2px 8px', borderRadius: 5 }}>{`L${finalL} ${LEVEL_MAP[finalL]?.label}`}</span> : ''}</td>
                                                <td style={{ fontSize: 12 }}>{a.managerReview?.promotionRecommended ? <span style={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={14} /> Yes</span> : <span style={{ color: '#94A3B8' }}>—</span>}</td>
                                                <td>
                                                    {a.status === 'hr-review' ? (
                                                        <button className="btn btn-primary btn-sm" onClick={() => openModal(a)}>Finalize</button>
                                                    ) : (
                                                        <button className="btn btn-secondary btn-sm" onClick={() => openModal(a)}>View</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* HR Review modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-box" style={{ maxWidth: 600, width: '94vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>HR Final Review — {selected.employee?.name}</h2><button onClick={() => setSelected(null)} className="modal-close"><X size={20} /></button></div>
                        <div style={{ padding: '0 4px' }}>
                            {/* Manager review summary */}
                            <div style={{ background: 'var(--bg-light)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Manager Review Summary</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    {Object.entries(selected.managerReview?.criteriaRatings || {}).filter(([, v]) => v).map(([k, v]) => (
                                        <div key={k} style={{ fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: </span><b>L{v}</b></div>
                                    ))}
                                </div>
                                {selected.managerReview?.strengths && <div style={{ marginTop: 8, fontSize: 12 }}><b>Strengths:</b> {selected.managerReview.strengths}</div>}
                                {selected.managerReview?.areasForImprovement && <div style={{ fontSize: 12 }}><b>Improvement:</b> {selected.managerReview.areasForImprovement}</div>}
                            </div>

                            {/* HR inputs */}
                            <div className="form-group">
                                <label className="form-label">Final Category Level</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                    {[1, 2, 3, 4].map(l => (
                                        <div key={l} onClick={() => setHrForm(f => ({ ...f, finalCategoryLevel: l }))}
                                            style={{ border: `2px solid ${hrForm.finalCategoryLevel === l ? LEVEL_MAP[l].color : 'var(--border)'}`, borderRadius: 8, padding: '10px', cursor: 'pointer', background: hrForm.finalCategoryLevel === l ? LEVEL_MAP[l].bg : 'transparent', transition: 'all 0.2s' }}>
                                            <span style={{ fontWeight: 700, color: LEVEL_MAP[l].color, fontSize: 13 }}>L{l}  {LEVEL_MAP[l].label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">HR Remarks</label>
                                <textarea className="form-control" rows={3} placeholder="Add final HR comments or remarks..." value={hrForm.hrRemarks} onChange={e => setHrForm(f => ({ ...f, hrRemarks: e.target.value }))} />
                            </div>
                        </div>
                        {selected.status === 'hr-review' && (
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button className="btn btn-danger" onClick={handleReject} disabled={processing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <XCircle size={18} /> Reject
                                </button>
                                <button className="btn btn-primary" onClick={handleApprove} disabled={processing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle size={18} /> {processing ? 'Processing...' : 'Approve'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRPMAppraisals;
