import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Banknote, Download, FileText, Calendar, Wallet } from 'lucide-react';
import { generatePayslip } from '../../utils/pdfExport';

const MySalarySlips = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPayrolls = async () => {
        try {
            const res = await api.get('/payroll/my-slips');
            setPayrolls(res.data);
        } catch (error) {
            toast.error('Failed to fetch salary slips');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayrolls();
    }, []);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1>My Payslips</h1>
                    <p>View and download your monthly payslips</p>
                </div>
            </div>

            <div className="grid-2" style={{ gap: 20 }}>
                {loading ? (
                    <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : payrolls.length === 0 ? (
                    <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px' }}>
                        <Wallet size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.3 }} />
                        <p style={{ color: 'var(--text-muted)' }}>No salary slips found yet.</p>
                    </div>
                ) : payrolls.map(p => (
                    <div key={p._id} className="card salary-card" style={{ display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'default' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ width: 48, height: 48, background: 'var(--secondary-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Banknote color="var(--secondary)" size={24} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{months[p.month - 1]} {p.year}</div>
                                    <span className={`badge ${p.status === 'Paid' ? 'badge-present' : 'badge-pending'}`} style={{ marginTop: 4 }}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => generatePayslip(p)} className="icon-btn info" title="Download PDF">
                                <Download size={20} />
                            </button>
                        </div>

                        <div style={{ background: 'var(--bg-light)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Gross Salary</span>
                                <span style={{ fontWeight: 600 }}>{(p.baseSalary + p.allowances.hra + p.allowances.transport + p.allowances.other).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total Deductions</span>
                                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- {(p.deductions.pf + p.deductions.tax + p.deductions.lop).toLocaleString()}</span>
                            </div>
                            <div className="divider" style={{ margin: '12px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Take Home</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary-dark)' }}>{p.netSalary.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={14} />
                                <span>Period: {p.month}/{p.year}</span>
                            </div>
                            {p.paidAt && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <FileText size={14} />
                                    <span>Paid on: {new Date(p.paidAt).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MySalarySlips;
