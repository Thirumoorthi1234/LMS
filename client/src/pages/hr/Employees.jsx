import React, { useState, useEffect } from 'react';
import { Plus, Edit, UserX, UserCheck, Search, RefreshCw, Users } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DEPTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Legal', 'Design', ''];
const POSITIONS = ['Manager', 'Senior Developer', 'Developer', 'Analyst', 'Designer', 'HR Executive', 'Accountant', ''];

const defaultForm = {
    name: '', email: '', password: '', role: 'employee', department: '', position: '', phone: '', employeeId: '', joiningDate: '',
    salary: { base: 0, allowances: { hra: 0, transport: 0, other: 0 }, deductions: { pf: 0, tax: 0 } },
    isActive: true
};

const HREmployees = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ open: false, mode: 'create', user: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/users', { params: { search } });
            // HR only sees employees (not admins or other HR)
            setEmployees(data.users.filter(u => u.role === 'employee'));
        } catch { toast.error('Failed to load employees'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEmployees(); }, []);

    const openCreate = () => { setForm({ ...defaultForm, role: 'employee' }); setModal({ open: true, mode: 'create', user: null }); };
    const openEdit = (u) => { setForm({ ...defaultForm, ...u, password: '' }); setModal({ open: true, mode: 'edit', user: u }); };
    const closeModal = () => setModal({ open: false, mode: 'create', user: null });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [field, subfield, subsubfield] = name.split('.');
            setForm(f => {
                const newData = { ...f };
                if (subsubfield) newData[field][subfield][subsubfield] = parseFloat(value) || 0;
                else newData[field][subfield] = parseFloat(value) || 0;
                return newData;
            });
        } else {
            setForm(f => ({ ...f, [name]: value }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, role: 'employee' }; // HR always creates employees
            if (modal.mode === 'create') {
                await api.post('/users', payload);
                toast.success('Employee created successfully!');
            } else {
                const { password, ...update } = payload;
                await api.put(`/users/${modal.user._id}`, update);
                if (form.password) await api.put(`/users/${modal.user._id}/password`, { password: form.password });
                toast.success('Employee updated!');
            }
            closeModal();
            fetchEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally { setSaving(false); }
    };

    const toggleStatus = async (emp) => {
        try {
            if (emp.isActive) {
                await api.delete(`/users/${emp._id}`);
                toast.success(`${emp.name} deactivated`);
            } else {
                await api.put(`/users/${emp._id}`, { isActive: true });
                toast.success(`${emp.name} reactivated`);
            }
            fetchEmployees();
        } catch { toast.error('Operation failed'); }
    };

    const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Employee Management</h1>
                <p>Manage employee profiles, departments, and onboarding</p>
            </div>

            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input className="form-control" placeholder="Search employees..." value={search}
                        onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchEmployees()} />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchEmployees}><RefreshCw size={14} /> Refresh</button>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Add Employee</button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th><th>Employee ID</th><th>Department</th>
                                <th>Position</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" style={{ width: j === 0 ? '160px' : '80px' }} /></td>)}</tr>
                                ))
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Users size={48} /></div><h3>No employees found</h3></div></td></tr>
                            ) : (
                                employees.map(emp => (
                                    <tr key={emp._id}>
                                        <td>
                                            <div className="table-avatar">
                                                <div className="table-avatar-img">{initials(emp.name)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{emp.employeeId || ''}</td>
                                        <td>{emp.department || ''}</td>
                                        <td>{emp.position || ''}</td>
                                        <td>
                                            <span className={`badge ${emp.isActive ? 'badge-present' : 'badge-rejected'}`}>
                                                <span className="badge-dot" />{emp.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(emp)} title="Edit"><Edit size={14} /></button>
                                                <button
                                                    className={`btn btn-sm btn-icon ${emp.isActive ? 'btn-danger' : 'btn-success'}`}
                                                    onClick={() => toggleStatus(emp)}
                                                    title={emp.isActive ? 'Deactivate' : 'Reactivate'}
                                                >
                                                    {emp.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Add New Employee' : 'Edit Employee'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Full Name</label>
                            <input name="name" className="form-control" value={form.name} onChange={handleChange} placeholder="John Doe" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Email</label>
                            <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} placeholder="john@company.com" required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Password{modal.mode === 'edit' && ' (leave blank to keep)'}</label>
                            <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required={modal.mode === 'create'} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Employee ID</label>
                            <input name="employeeId" className="form-control" value={form.employeeId} onChange={handleChange} placeholder="EMP003" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <select name="department" className="form-control" value={form.department} onChange={handleChange}>
                                <option value="">Select Department</option>
                                {DEPTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Position</label>
                            <select name="position" className="form-control" value={form.position} onChange={handleChange}>
                                <option value="">Select Position</option>
                                {POSITIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        {/* Role is locked to employee for HR */}
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input className="form-control" value="Employee" readOnly style={{ background: 'var(--bg-light)', cursor: 'not-allowed', color: 'var(--text-muted)' }} />
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>HR can only create employee accounts</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input name="phone" className="form-control" value={form.phone} onChange={handleChange} placeholder="+91 9876543210" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Joining Date</label>
                        <input name="joiningDate" type="date" className="form-control" value={form.joiningDate?.slice?.(0, 10) || ''} onChange={handleChange} />
                    </div>

                    <div className="divider" style={{ margin: '24px 0' }} />
                    <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--primary)' }}>Salary Configuration</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Base Salary</label>
                            <input name="salary.base" type="number" className="form-control" value={form.salary.base} onChange={handleChange} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">HRA Allowance</label>
                            <input name="salary.allowances.hra" type="number" className="form-control" value={form.salary.allowances.hra} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Transport Allowance</label>
                            <input name="salary.allowances.transport" type="number" className="form-control" value={form.salary.allowances.transport} onChange={handleChange} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Other Allowances</label>
                            <input name="salary.allowances.other" type="number" className="form-control" value={form.salary.allowances.other} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">PF Deduction</label>
                            <input name="salary.deductions.pf" type="number" className="form-control" value={form.salary.deductions.pf} onChange={handleChange} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax Deduction</label>
                            <input name="salary.deductions.tax" type="number" className="form-control" value={form.salary.deductions.tax} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : (modal.mode === 'create' ? 'Create Employee' : 'Save Changes')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default HREmployees;
