import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ClipboardList, FileText, Star, Save, Send, CheckCircle, AlertCircle, Info } from 'lucide-react';

const LEVEL_MAP = { 1: { label: 'Level 1  Outstanding', color: '#10B981', bg: '#ECFDF5' }, 2: { label: 'Level 2  Exceeds Expectations', color: '#4F9CF9', bg: '#EFF6FF' }, 3: { label: 'Level 3  Meets Expectations', color: '#F59E0B', bg: '#FFFBEB' }, 4: { label: 'Level 4  Needs Improvement', color: '#EF4444', bg: '#FEF2F2' } };
const STATUS_META = {
    draft: { label: 'Draft', color: '#94A3B8', bg: '#F1F5F9' },
    submitted: { label: 'Submitted', color: '#F59E0B', bg: '#FFFBEB' },
    'under-review': { label: 'Under Review', color: '#4F9CF9', bg: '#EFF6FF' },
    'hr-review': { label: 'HR Review', color: '#8B5CF6', bg: '#F5F3FF' },
    approved: { label: 'Approved ', color: '#10B981', bg: '#ECFDF5' },
    rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEF2F2' }
};

const RatingSelect = ({ value, onChange, disabled }) => (
    <select className="form-control" value={value || ''} onChange={e => onChange(Number(e.target.value) || null)} disabled={disabled} style={{ width: 120 }}>
        <option value="">Select</option>
        <option value={1}>1  Outstanding</option>
        <option value={2}>2  Exceeds</option>
        <option value={3}>3  Meets</option>
        <option value={4}>4  Needs Improvement</option>
    </select>
);

const PMAppraisalEmployee = () => {
    const { user } = useAuth();
    const [appraisal, setAppraisal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        projectName: '', appraisalPeriod: '',
        selfAppraisal: { keyAchievements: '', completedTasks: '', technicalImprovement: '', teamCollaboration: '', problemSolving: '', trainingsCompleted: '', selfRating: { technical: null, communication: null, productivity: null, teamwork: null } }
    });

    const fetchAppraisal = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/pmappraisals');
            if (data.appraisals?.length > 0) {
                const a = data.appraisals[0];
                setAppraisal(a);
                setForm({
                    projectName: a.projectName || '', appraisalPeriod: a.appraisalPeriod || '',
                    selfAppraisal: { keyAchievements: a.selfAppraisal?.keyAchievements || '', completedTasks: a.selfAppraisal?.completedTasks || '', technicalImprovement: a.selfAppraisal?.technicalImprovement || '', teamCollaboration: a.selfAppraisal?.teamCollaboration || '', problemSolving: a.selfAppraisal?.problemSolving || '', trainingsCompleted: a.selfAppraisal?.trainingsCompleted || '', selfRating: a.selfAppraisal?.selfRating || { technical: null, communication: null, productivity: null, teamwork: null } }
                });
            }
        } catch { toast.error('Failed to load appraisal'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAppraisal(); }, []);

    const handleCreate = async () => {
        try {
            const { data } = await api.post('/pmappraisals', { projectName: '', appraisalPeriod: '' });
            setAppraisal(data.appraisal);
            toast.success('Draft created!');
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    };

    const handleSave = async () => {
        if (!appraisal) return;
        setSaving(true);
        try {
            const { data } = await api.put(`/pmappraisals/${appraisal._id}`, form);
            setAppraisal(data.appraisal);
            toast.success('Saved!');
        } catch { toast.error('Save failed'); }
        finally { setSaving(false); }
    };

    const handleSubmit = async () => {
        if (!confirm('Submit your self-appraisal? You cannot edit it after submission.')) return;
        setSubmitting(true);
        try {
            await handleSave();
            const { data } = await api.post(`/pmappraisals/${appraisal._id}/submit`);
            setAppraisal(data.appraisal);
            toast.success('Submitted to Project Manager!');
        } catch { toast.error('Submit failed'); }
        finally { setSubmitting(false); }
    };

    const sf = (field, val) => setForm(f => ({ ...f, selfAppraisal: { ...f.selfAppraisal, [field]: val } }));
    const sr = (field, val) => setForm(f => ({ ...f, selfAppraisal: { ...f.selfAppraisal, selfRating: { ...f.selfAppraisal.selfRating, [field]: val } } }));

    const isDraft = appraisal?.status === 'draft';
    const sm = STATUS_META[appraisal?.status] || STATUS_META.draft;
    const finalLevel = appraisal?.hrReview?.finalCategoryLevel;
    const mgrLevel = appraisal?.managerReview?.categoryLevel;

    return (
        <div className="fade-in">
            <div className="page-header"><h1>My Performance Appraisal</h1><p>Fill and submit your self-appraisal for review</p></div>

            {loading ? <div className="card skeleton" style={{ height: 200 }} /> :

                !appraisal ? (
                    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ marginBottom: 16, color: 'var(--primary)' }}><ClipboardList size={64} /></div>
                        <h2 style={{ marginBottom: 10 }}>No Appraisal Yet</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Start your self-appraisal to submit for review.</p>
                        <button className="btn btn-primary" onClick={handleCreate}>+ Start Appraisal</button>
                    </div>
                ) : (
                    <>
                        {/* Status Banner */}
                        <div className="card" style={{ padding: '14px 20px', marginBottom: 20, background: sm.bg, border: `1.5px solid ${sm.color}40`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontWeight: 700, color: sm.color, fontSize: 14 }}>Status: {sm.label}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 16 }}>ID: {appraisal.appraisalId}</span>
                            </div>
                            {finalLevel && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Final Result</div><div style={{ fontWeight: 800, color: LEVEL_MAP[finalLevel]?.color, fontSize: 15 }}>{LEVEL_MAP[finalLevel]?.label}</div></div>}
                        </div>

                        {/* HR Remarks (on approval) */}
                        {appraisal.status === 'approved' && appraisal.hrReview?.hrRemarks && (
                            <div className="card" style={{ background: '#ECFDF5', border: '1.5px solid #10B98140', marginBottom: 20, padding: '14px 20px' }}>
                                <div style={{ fontWeight: 700, color: '#10B981', marginBottom: 6 }}>HR Remarks</div>
                                <p style={{ fontSize: 13, margin: 0 }}>{appraisal.hrReview.hrRemarks}</p>
                            </div>
                        )}

                        {/* Manager Feedback (visible after review) */}
                        {['hr-review', 'approved'].includes(appraisal.status) && appraisal.managerReview?.categoryLevel && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Manager Review Summary</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Category Level</div><div style={{ fontWeight: 800, color: LEVEL_MAP[mgrLevel]?.color, fontSize: 15 }}>{LEVEL_MAP[mgrLevel]?.label}</div></div>
                                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Promotion Recommended</div><div style={{ fontWeight: 700, color: appraisal.managerReview.promotionRecommended ? '#10B981' : '#94A3B8' }}>{appraisal.managerReview.promotionRecommended ? ' Yes' : ' No'}</div></div>
                                    {appraisal.managerReview.strengths && <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Strengths</div><div style={{ fontSize: 13 }}>{appraisal.managerReview.strengths}</div></div>}
                                    {appraisal.managerReview.areasForImprovement && <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Areas for Improvement</div><div style={{ fontSize: 13 }}>{appraisal.managerReview.areasForImprovement}</div></div>}
                                </div>
                            </div>
                        )}

                        {/* Self-Appraisal Form */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={18} className="text-secondary" /> Self-Appraisal Form
                            </h3>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Appraisal Period</label><input className="form-control" value={form.appraisalPeriod} onChange={e => setForm(f => ({ ...f, appraisalPeriod: e.target.value }))} placeholder="e.g. Q1 2024" disabled={!isDraft} /></div>
                                <div className="form-group"><label className="form-label">Project Name</label><input className="form-control" value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder="Current project" disabled={!isDraft} /></div>
                            </div>
                            {[
                                { label: 'Key Achievements', field: 'keyAchievements', placeholder: 'List your key achievements this period...' },
                                { label: 'Completed Tasks / Projects', field: 'completedTasks', placeholder: 'List tasks, features, or projects completed...' },
                                { label: 'Technical Skills Improvement', field: 'technicalImprovement', placeholder: 'Describe skills you improved or learned...' },
                                { label: 'Team Collaboration', field: 'teamCollaboration', placeholder: 'How did you contribute to the team...?' },
                                { label: 'Problem Solving Contribution', field: 'problemSolving', placeholder: 'Describe problems you solved...' },
                                { label: 'Trainings / Certifications Completed', field: 'trainingsCompleted', placeholder: 'e.g. AWS Certification, React course...' },
                            ].map(({ label, field, placeholder }) => (
                                <div key={field} className="form-group">
                                    <label className="form-label">{label}</label>
                                    <textarea className="form-control" rows={3} value={form.selfAppraisal[field]} onChange={e => sf(field, e.target.value)} placeholder={placeholder} disabled={!isDraft} />
                                </div>
                            ))}
                        </div>

                        {/* Self Rating */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Star size={18} className="text-warning" /> Self Rating (Optional)
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                                {[['technical', 'Technical Skills'], ['communication', 'Communication'], ['productivity', 'Productivity'], ['teamwork', 'Teamwork']].map(([key, label]) => (
                                    <div key={key} className="form-group">
                                        <label className="form-label">{label}</label>
                                        <RatingSelect value={form.selfAppraisal.selfRating[key]} onChange={val => sr(key, val)} disabled={!isDraft} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action buttons */}
                        {isDraft && (
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
                                </button>
                                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Appraisal'}
                                </button>
                            </div>
                        )}
                    </>
                )}
        </div>
    );
};

export default PMAppraisalEmployee;
