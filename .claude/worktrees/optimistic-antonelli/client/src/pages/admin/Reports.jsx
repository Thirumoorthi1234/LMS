import React, { useState } from 'react';
import { Download, FileSpreadsheet, BarChart3 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.svg';

const Reports = () => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const [attFilter, setAttFilter] = useState({ startDate: monthStart, endDate: today });
    const [leaveFilter, setLeaveFilter] = useState({ startDate: monthStart, endDate: today, status: '' });
    const [exporting, setExporting] = useState('');

    const exportReport = async (type) => {
        setExporting(type);
        try {
            const params = type === 'attendance'
                ? { ...attFilter, format: 'excel' }
                : { ...leaveFilter, format: 'excel' };
            const res = await api.get(`/reports/${type}`, { params, responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_report_${Date.now()}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`${type} report exported!`);
        } catch { toast.error('Export failed. Please try again.'); }
        finally { setExporting(''); }
    };

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={logo} alt="Learnlike Logo" style={{ height: '48px', width: 'auto' }} />
                <div>
                    <h1>Reports & Analytics</h1>
                    <p>Export attendance and leave reports as Excel files</p>
                </div>
            </div>

            <div className="grid-2" style={{ gap: 20 }}>
                {/* Attendance Report */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BarChart3 size={20} color="var(--primary)" />
                            </div>
                            <div><div className="card-title">Attendance Report</div><p style={{ fontSize: 12, margin: 0 }}>Check-in/check-out with location</p></div>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">From Date</label>
                            <input type="date" className="form-control" value={attFilter.startDate} onChange={e => setAttFilter(f => ({ ...f, startDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">To Date</label>
                            <input type="date" className="form-control" value={attFilter.endDate} onChange={e => setAttFilter(f => ({ ...f, endDate: e.target.value }))} />
                        </div>
                    </div>
                    <button className="btn btn-primary w-full" onClick={() => exportReport('attendance')} disabled={exporting === 'attendance'} style={{ width: '100%' }}>
                        {exporting === 'attendance' ? 'Exporting...' : <><FileSpreadsheet size={16} /> Export Attendance (.xlsx)</>}
                    </button>
                </div>

                {/* Leave Report */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FileSpreadsheet size={20} color="var(--secondary)" />
                            </div>
                            <div><div className="card-title">Leave Report</div><p style={{ fontSize: 12, margin: 0 }}>Leave applications with status</p></div>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">From Date</label>
                            <input type="date" className="form-control" value={leaveFilter.startDate} onChange={e => setLeaveFilter(f => ({ ...f, startDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">To Date</label>
                            <input type="date" className="form-control" value={leaveFilter.endDate} onChange={e => setLeaveFilter(f => ({ ...f, endDate: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status Filter</label>
                        <select className="form-control" value={leaveFilter.status} onChange={e => setLeaveFilter(f => ({ ...f, status: e.target.value }))}>
                            <option value="">All Status</option>
                            <option value="pending">Pending</option><option value="approved">Approved</option>
                            <option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button className="btn btn-success w-full" onClick={() => exportReport('leaves')} disabled={exporting === 'leaves'} style={{ width: '100%' }}>
                        {exporting === 'leaves' ? 'Exporting...' : <><FileSpreadsheet size={16} /> Export Leaves (.xlsx)</>}
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-title" style={{ marginBottom: 16 }}>Export Tips</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                    {[
                        { icon: '', title: 'Attendance Report', desc: 'Includes check-in/out times, locations, hours worked, and status for each day' },
                        { icon: '', title: 'Leave Report', desc: 'Includes employee details, leave type, dates, duration, reason, status, and admin remarks' },
                        { icon: '', title: 'Excel Format', desc: 'Reports are exported as .xlsx files compatible with Microsoft Excel and Google Sheets' },
                    ].map(tip => (
                        <div key={tip.title} style={{ background: 'var(--bg-light)', borderRadius: 'var(--radius)', padding: '16px' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>{tip.icon}</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14 }}>{tip.title}</div>
                            <p style={{ fontSize: 12, margin: 0 }}>{tip.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Reports;
