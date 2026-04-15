import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, UserCheck, Target, Award, CheckCircle, Clock, Search, Briefcase } from 'lucide-react';

const LEVEL_MAP = {
    1: { label: 'Level 1  Outstanding', color: '#10B981', bg: '#ECFDF5', desc: 'Exceptional performance  far exceeds all expectations' },
    2: { label: 'Level 2  Exceeds Expectations', color: '#4F9CF9', bg: '#EFF6FF', desc: 'Above average  consistently outperforms requirements' },
    3: { label: 'Level 3  Meets Expectations', color: '#F59E0B', bg: '#FFFBEB', desc: 'Standard performance  meets all job requirements' },
    4: { label: 'Level 4  Needs Improvement', color: '#EF4444', bg: '#FEF2F2', desc: 'Below expectations  requires development support' },
};

const RatingSelect = ({ value, onChange, disabled }) => (
    <select className="form-control" value={value || ''} onChange={e => onChange(Number(e.target.value) || null)} disabled={disabled} style={{ maxWidth: 200 }}>
        <option value="">Select Rating</option>
        <option value={1}>1  Outstanding</option>
        <option value={2}>2  Exceeds Expectations</option>
        <option value={3}>3  Meets Expectations</option>
        <option value={4}>4  Needs Improvement</option>
    </select>
);

const AppraisalReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [appraisal, setAppraisal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [review, setReview] = useState({
        criteriaRatings: { workQuality: null, productivity: null, technicalSkills: null, teamCollaboration: null, problemSolving: null },
        categoryLevel: null,
        strengths: '', areasForImprovement: '', trainingRecommendations: '', managerComments: '', promotionRecommended: false
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/pmappraisals/${id}`);
                setAppraisal(data.appraisal);
                if (data.appraisal.managerReview?.categoryLevel) {
                    const mr = data.appraisal.managerReview;
                    setReview({ criteriaRatings: mr.criteriaRatings || review.criteriaRatings, categoryLevel: mr.categoryLevel, strengths: mr.strengths || '', areasForImprovement: mr.areasForImprovement || '', trainingRecommendations: mr.trainingRecommendations || '', managerComments: mr.managerComments || '', promotionRecommended: mr.promotionRecommended || false });
                }
            } catch { toast.error('Failed to load appraisal'); }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

    const setCriteria = (field, val) => setReview(r => ({ ...r, criteriaRatings: { ...r.criteriaRatings, [field]: val } }));

    const avgRating = () => {
        const vals = Object.values(review.criteriaRatings).filter(Boolean);
        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
    };

    const handleSubmitReview = async () => {
        if (!review.categoryLevel) { toast.error('Please assign a Category Level'); return; }
        const missing = Object.entries(review.criteriaRatings).filter(([, v]) => !v);
        if (missing.length) { toast.error('Please rate all criteria'); return; }
        if (!review.strengths.trim()) { toast.error('Please fill in Strengths'); return; }

        setSubmitting(true);
        try {
            const { data } = await api.post(`/pmappraisals/${id}/review`, { managerReview: review });
            setAppraisal(data.appraisal);
            toast.success('Review submitted  sent to HR!');
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSubmitting(false); }
    };

    const isEditable = appraisal && ['submitted', 'under-review'].includes(appraisal.status);

    if (loading) return <div className="card skeleton fade-in" style={{ height: 400 }} />;
    if (!appraisal) return <div className="card fade-in"><p>Appraisal not found.</p></div>;

    const emp = appraisal.employee;
    const sa = appraisal.selfAppraisal || {};

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => navigate('/pm/appraisals')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <h1 style={{ margin: 0 }}>Appraisal Review — {emp?.name}</h1>
            </div>

            {/* Employee Overview */}
            <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#4F9CF9,#8B5CF6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>{emp?.name?.[0] || '?'}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{emp?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp?.position} · {emp?.department} · {emp?.employeeId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Period</div>
                    <div style={{ fontWeight: 700 }}>{appraisal.appraisalPeriod || ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Project: {appraisal.projectName || ''}</div>
                </div>
            </div>

            {/* Self-Appraisal Review */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserCheck size={18} className="text-primary" /> Employee Self-Appraisal
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                        { label: 'Key Achievements', val: sa.keyAchievements },
                        { label: 'Completed Tasks', val: sa.completedTasks },
                        { label: 'Technical Improvement', val: sa.technicalImprovement },
                        { label: 'Team Collaboration', val: sa.teamCollaboration },
                        { label: 'Problem Solving', val: sa.problemSolving },
                        { label: 'Trainings Completed', val: sa.trainingsCompleted },
                    ].map(({ label, val }) => (
                        <div key={label}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 13, background: 'var(--bg-light)', borderRadius: 8, padding: '8px 12px', minHeight: 36 }}>{val || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
                        </div>
                    ))}
                </div>
                {/* Self-rating chips */}
                {sa.selfRating && (
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(sa.selfRating).filter(([, v]) => v).map(([k, v]) => (
                            <span key={k} style={{ fontSize: 11, background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>{k.charAt(0).toUpperCase() + k.slice(1)}: <b>L{v}</b></span>
                        ))}
                    </div>
                )}
            </div>

            {/* Manager Review Form */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={18} className="text-secondary" /> Manager Review Criteria
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
                    {[
                        { key: 'workQuality', label: 'Work Quality', desc: 'Accuracy and reliability of work' },
                        { key: 'productivity', label: 'Productivity', desc: 'Task completion efficiency' },
                        { key: 'technicalSkills', label: 'Technical Skills', desc: 'Coding / technical capability' },
                        { key: 'teamCollaboration', label: 'Team Collaboration', desc: 'Working with team' },
                        { key: 'problemSolving', label: 'Problem Solving', desc: 'Ability to resolve issues' },
                    ].map(({ key, label, desc }) => (
                        <div key={key} className="form-group">
                            <label className="form-label">{label} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>({desc})</span></label>
                            <RatingSelect value={review.criteriaRatings[key]} onChange={val => setCriteria(key, val)} disabled={!isEditable} />
                        </div>
                    ))}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Average Rating</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#4F9CF9' }}>{avgRating() || ''}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>out of 4</div>
                    </div>
                </div>

                {/* Category Level */}
                <h4 style={{ margin: '0 0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={16} className="text-warning" /> Category Level Assignment
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[1, 2, 3, 4].map(l => (
                        <div key={l} onClick={() => isEditable && setReview(r => ({ ...r, categoryLevel: l }))}
                            style={{ border: `2px solid ${review.categoryLevel === l ? LEVEL_MAP[l].color : 'var(--border)'}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center', cursor: isEditable ? 'pointer' : 'default', background: review.categoryLevel === l ? LEVEL_MAP[l].bg : 'var(--card-bg)', transition: 'all 0.2s' }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: LEVEL_MAP[l].color }}>L{l}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: LEVEL_MAP[l].color }}>{LEVEL_MAP[l].label.split('')[1]?.trim()}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{LEVEL_MAP[l].desc}</div>
                        </div>
                    ))}
                </div>

                {/* Feedback text fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                        { key: 'strengths', label: 'Strengths *', placeholder: 'Key strengths of the employee...' },
                        { key: 'areasForImprovement', label: 'Areas for Improvement', placeholder: 'Areas to develop and grow...' },
                        { key: 'trainingRecommendations', label: 'Training Recommendations', placeholder: 'e.g. Leadership course, Cloud certification...' },
                        { key: 'managerComments', label: 'Additional Comments', placeholder: 'General comments or notes...' },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key} className="form-group">
                            <label className="form-label">{label}</label>
                            <textarea className="form-control" rows={3} placeholder={placeholder} value={review[key]} onChange={e => setReview(r => ({ ...r, [key]: e.target.value }))} disabled={!isEditable} />
                        </div>
                    ))}
                </div>
                <div className="form-group" style={{ marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: isEditable ? 'pointer' : 'default', fontSize: 14, fontWeight: 600 }}>
                        <input type="checkbox" checked={review.promotionRecommended} onChange={e => isEditable && setReview(r => ({ ...r, promotionRecommended: e.target.checked }))} disabled={!isEditable} style={{ width: 18, height: 18 }} />
                        Recommend for Promotion
                    </label>
                </div>
            </div>

            {isEditable && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleSubmitReview} disabled={submitting} style={{ minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <CheckCircle size={18} /> {submitting ? 'Submitting...' : 'Submit Review to HR'}
                    </button>
                </div>
            )}
            {!isEditable && appraisal.status === 'hr-review' && (
                <div className="card" style={{ background: '#F5F3FF', border: '1.5px solid #8B5CF6', textAlign: 'center', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Clock size={20} className="text-secondary" style={{ color: '#8B5CF6' }} />
                    <div style={{ fontWeight: 700, color: '#8B5CF6', fontSize: 14 }}> Review submitted  Awaiting HR final approval</div>
                </div>
            )}
        </div>
    );
};

export default AppraisalReview;
