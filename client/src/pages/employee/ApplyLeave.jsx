import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';

const ApplyLeave = () => {
    const navigate = useNavigate();
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [form, setForm] = useState({ leaveType: '', startDate: null, endDate: null, reason: '', isHalfDay: false });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        api.get('/leave-types').then(({ data }) => setLeaveTypes(data.leaveTypes));
    }, []);

    const validate = () => {
        const e = {};
        if (!form.leaveType) e.leaveType = 'Please select a leave type';
        if (!form.startDate) e.startDate = 'Start date is required';
        if (!form.endDate) e.endDate = 'End date is required';
        if (form.startDate && form.endDate && form.startDate > form.endDate) e.endDate = 'End date must be after start date';
        if (!form.reason.trim()) e.reason = 'Please provide a reason';
        if (form.reason.trim().length < 10) e.reason = 'Reason must be at least 10 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const numDays = form.startDate && form.endDate
        ? form.isHalfDay ? 0.5 : Math.ceil((form.endDate - form.startDate) / (1000 * 60 * 60 * 24)) + 1
        : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            await api.post('/leaves', {
                leaveType: form.leaveType,
                startDate: form.startDate?.toISOString().split('T')[0],
                endDate: form.endDate?.toISOString().split('T')[0],
                reason: form.reason,
                isHalfDay: form.isHalfDay
            });
            toast.success(' Leave application submitted successfully!');
            navigate('/employee/leave-history');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally { setSubmitting(false); }
    };

    const selectedType = leaveTypes.find(lt => lt._id === form.leaveType);

    return (
        <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
            <div className="page-header">
                <h1>Apply for Leave</h1>
                <p>Submit a new leave request for approval</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    {/* Leave Type */}
                    <div className="form-group">
                        <label className="form-label required">Leave Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: errors.leaveType ? 8 : 0 }}>
                            {leaveTypes.map(lt => (
                                <div key={lt._id}
                                    onClick={() => setForm(f => ({ ...f, leaveType: lt._id }))}
                                    style={{
                                        padding: '12px', border: `2px solid ${form.leaveType === lt._id ? lt.color : 'var(--border)'}`,
                                        borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.2s',
                                        background: form.leaveType === lt._id ? `${lt.color}15` : 'white',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: lt.color, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lt.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lt.defaultDays} days/yr</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {errors.leaveType && <div className="form-error">{errors.leaveType}</div>}
                    </div>

                    {/* Half Day Toggle */}
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                            <input type="checkbox" checked={form.isHalfDay} onChange={e => setForm(f => ({ ...f, isHalfDay: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                            <span><strong>Half Day Leave</strong> (0.5 days)</span>
                        </label>
                    </div>

                    {/* Date Range */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Start Date</label>
                            <DatePicker
                                selected={form.startDate}
                                onChange={d => setForm(f => ({ ...f, startDate: d }))}
                                minDate={new Date()}
                                placeholderText="Select start date"
                                dateFormat="dd/MM/yyyy"
                                className={errors.startDate ? 'error' : ''}
                            />
                            {errors.startDate && <div className="form-error">{errors.startDate}</div>}
                        </div>
                        <div className="form-group">
                            <label className="form-label required">End Date</label>
                            <DatePicker
                                selected={form.endDate}
                                onChange={d => setForm(f => ({ ...f, endDate: d }))}
                                minDate={form.startDate || new Date()}
                                placeholderText="Select end date"
                                dateFormat="dd/MM/yyyy"
                                disabled={form.isHalfDay}
                                className={errors.endDate ? 'error' : ''}
                            />
                            {errors.endDate && <div className="form-error">{errors.endDate}</div>}
                        </div>
                    </div>

                    {/* Days Preview */}
                    {numDays > 0 && (
                        <div style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}></span>
                            <span style={{ fontSize: 14, color: 'var(--primary-dark)' }}>
                                <strong>{numDays} {numDays === 1 ? 'day' : 'days'}</strong> of {selectedType?.name || 'leave'} will be applied
                            </span>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="form-group">
                        <label className="form-label required">Reason for Leave</label>
                        <textarea
                            className={`form-control${errors.reason ? ' error' : ''}`} rows={4}
                            placeholder="Please describe the reason for your leave (at least 10 characters)..."
                            value={form.reason}
                            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {errors.reason ? <div className="form-error">{errors.reason}</div> : <span />}
                            <span className="form-hint">{form.reason.length} chars</span>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/employee/dashboard')}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : <><Send size={15} /> Submit Leave Request</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplyLeave;
