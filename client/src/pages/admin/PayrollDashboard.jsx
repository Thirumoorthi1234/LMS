import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Banknote, Download, Filter, RefreshCw, CheckCircle2, AlertCircle, Pencil, X, Save } from 'lucide-react';
import { generatePayslip } from '../../utils/pdfExport';

const PayrollDashboard = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Manual edit state
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const res = await api.get('/payroll/all', { params: { month, year } });
            setPayrolls(res.data);
        } catch (error) {
            toast.error('Failed to fetch payroll records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayrolls();
    }, [month, year]);

    const handleGenerate = async () => {
        if (!window.confirm(`Generate payroll for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}?`)) return;

        setGenerating(true);
        try {
            const res = await api.post('/payroll/generate', { month, year });
            toast.success(res.data.message);
            fetchPayrolls();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/payroll/${id}/status`, { status });
            toast.success(`Marked as ${status}`);
            fetchPayrolls();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const startEdit = (p) => {
        setEditId(p._id);
        setEditForm({
            baseSalary: p.baseSalary,
            hra: p.allowances.hra,
            transport: p.allowances.transport,
            other: p.allowances.other,
            pf: p.deductions.pf,
            tax: p.deductions.tax,
            lop: p.deductions.lop,
            netSalary: p.netSalary,
        });
    };

    const cancelEdit = () => { setEditId(null); setEditForm({}); };

    const handleEditChange = (field, value) => {
        const num = parseFloat(value) || 0;
        const updated = { ...editForm, [field]: num };

        // Auto-recalculate net salary when any component changes
        const totalAllowances = (updated.hra || 0) + (updated.transport || 0) + (updated.other || 0);
        const totalDeductions = (updated.pf || 0) + (updated.tax || 0) + (updated.lop || 0);
        updated.netSalary = Math.max(0, (updated.baseSalary || 0) + totalAllowances - totalDeductions);

        setEditForm(updated);
    };

    // Allow direct override of net salary without auto-recalc
    const handleNetSalaryChange = (value) => {
        setEditForm(f => ({ ...f, netSalary: parseFloat(value) || 0 }));
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            await api.patch(`/payroll/${editId}/amount`, {
                baseSalary: editForm.baseSalary,
                allowances: { hra: editForm.hra, transport: editForm.transport, other: editForm.other },
                deductions: { pf: editForm.pf, tax: editForm.tax, lop: editForm.lop },
                netSalary: editForm.netSalary,
            });
            toast.success('Payroll updated successfully');
            cancelEdit();
            fetchPayrolls();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const stats = {
        total: payrolls.length,
        paid: payrolls.filter(p => p.status === 'Paid').length,
        pending: payrolls.filter(p => p.status === 'Draft').length,
        amount: payrolls.reduce((sum, p) => sum + p.netSalary, 0)
    };

    const inputStyle = {
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '4px 8px',
        fontSize: 13,
        width: '100%',
        background: 'var(--bg)',
        color: 'var(--text)',
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1>Payroll Management</h1>
                    <p>Generate and manage employee monthly salary payments</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 12px' }}>
                        <Filter size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
                        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ border: 'none', padding: '8px 4px', fontSize: 14 }}>
                            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ border: 'none', padding: '8px 4px', fontSize: 14 }}>
                            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                        {generating ? <RefreshCw size={18} className="spin" /> : <Banknote size={18} />}
                        Generate Payroll
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="card">
                    <div className="card-title" style={{ fontSize: 12, opacity: 0.7 }}>Total Payout</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>{stats.amount.toLocaleString()}</div>
                </div>
                <div className="card">
                    <div className="card-title" style={{ fontSize: 12, opacity: 0.7 }}>Records</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--secondary)', marginTop: 4 }}>{stats.total}</div>
                </div>
                <div className="card">
                    <div className="card-title" style={{ fontSize: 12, opacity: 0.7 }}>Status</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>{stats.paid} Paid</span>
                        <span style={{ fontSize: 14, color: 'var(--warning)', fontWeight: 600 }}>{stats.pending} Pending</span>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Base Salary</th>
                                <th>Allowances</th>
                                <th>Deductions (LOP)</th>
                                <th>Net Salary</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
                            ) : payrolls.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                                        <div style={{ color: 'var(--text-muted)' }}>
                                            <AlertCircle size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                                            <p>No payroll records found for this period.</p>
                                            <button onClick={handleGenerate} className="link" style={{ marginTop: 8 }}>Generate Now</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : payrolls.map(p => (
                                <React.Fragment key={p._id}>
                                    <tr>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.userId?.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.userId?.employeeId}  {p.userId?.position}</div>
                                        </td>
                                        <td>{p.baseSalary.toLocaleString()}</td>
                                        <td>{(p.allowances.hra + p.allowances.transport + p.allowances.other).toLocaleString()}</td>
                                        <td style={{ color: p.deductions.lop > 0 ? 'var(--danger)' : 'inherit' }}>
                                            {(p.deductions.pf + p.deductions.tax + p.deductions.lop).toLocaleString()}
                                            {p.deductions.lop > 0 && <div style={{ fontSize: 10 }}>LOP: {p.deductions.lop.toLocaleString()}</div>}
                                        </td>
                                        <td style={{ fontWeight: 800, color: 'var(--secondary-dark)' }}>{p.netSalary.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${p.status === 'Paid' ? 'badge-present' : 'badge-pending'}`}>
                                                <span className="badge-dot" /> {p.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => editId === p._id ? cancelEdit() : startEdit(p)}
                                                    className={`icon-btn ${editId === p._id ? 'danger' : 'warning'}`}
                                                    title={editId === p._id ? 'Cancel Edit' : 'Manual Entry'}
                                                >
                                                    {editId === p._id ? <X size={16} /> : <Pencil size={16} />}
                                                </button>
                                                {p.status !== 'Paid' && (
                                                    <button onClick={() => updateStatus(p._id, 'Paid')} className="icon-btn success" title="Mark as Paid">
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => generatePayslip(p)} className="icon-btn info" title="Download Slip">
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Inline Manual Edit Row */}
                                    {editId === p._id && (
                                        <tr style={{ background: 'var(--primary-light, #f0f4ff)' }}>
                                            <td colSpan="7" style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', minWidth: 120 }}>
                                                         Manual Entry
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 110 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Base Salary ()</div>
                                                        <input type="number" style={inputStyle} value={editForm.baseSalary}
                                                            onChange={e => handleEditChange('baseSalary', e.target.value)} />
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 90 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>HRA ()</div>
                                                        <input type="number" style={inputStyle} value={editForm.hra}
                                                            onChange={e => handleEditChange('hra', e.target.value)} />
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 90 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Transport ()</div>
                                                        <input type="number" style={inputStyle} value={editForm.transport}
                                                            onChange={e => handleEditChange('transport', e.target.value)} />
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 90 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>PF ()</div>
                                                        <input type="number" style={inputStyle} value={editForm.pf}
                                                            onChange={e => handleEditChange('pf', e.target.value)} />
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 90 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Tax ()</div>
                                                        <input type="number" style={inputStyle} value={editForm.tax}
                                                            onChange={e => handleEditChange('tax', e.target.value)} />
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 110 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Net Salary () <span style={{ color: 'var(--primary)', fontWeight: 700 }}></span></div>
                                                        <input type="number" style={{ ...inputStyle, borderColor: 'var(--primary)', fontWeight: 700 }}
                                                            value={editForm.netSalary}
                                                            onChange={e => handleNetSalaryChange(e.target.value)} />
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}
                                                            style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                                                            Save
                                                        </button>
                                                        <button className="btn btn-outline btn-sm" onClick={cancelEdit}
                                                            style={{ height: 36 }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                                     Editing Base Salary / Allowances / Deductions will auto-recalculate Net Salary. You can also override Net Salary directly.
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PayrollDashboard;
