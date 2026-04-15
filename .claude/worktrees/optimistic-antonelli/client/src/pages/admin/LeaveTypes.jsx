import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Settings } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const defaultForm = { name: '', code: '', defaultDays: 0, color: '#4F9CF9', carryForward: false, maxCarryForward: 0, isPaid: true, requiresApproval: true, description: '' };

const LeaveTypes = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);

    const fetch = async () => {
        setLoading(true);
        try { const { data } = await api.get('/leave-types/all'); setTypes(data.leaveTypes); }
        catch { toast.error('Failed to load leave types'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (item) => { setForm({ ...defaultForm, ...item }); setModal({ open: true, mode: 'edit', item }); };
    const close = () => setModal({ open: false, mode: 'create', item: null });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (modal.mode === 'create') { await api.post('/leave-types', form); toast.success('Leave type created!'); }
            else { await api.put(`/leave-types/${modal.item._id}`, form); toast.success('Leave type updated!'); }
            close(); fetch();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const toggleActive = async (item) => {
        try {
            await api.put(`/leave-types/${item._id}`, { isActive: !item.isActive });
            toast.success(`${item.name} ${!item.isActive ? 'activated' : 'deactivated'}`); fetch();
        } catch { toast.error('Failed'); }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Leave Types & Policies</h1>
                <p>Configure leave categories, days, and carry-forward rules</p>
            </div>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Leave Type</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                {loading ? Array(6).fill(0).map((_, i) => <div key={i} className="skeleton skeleton-card" />) :
                    types.length === 0 ? <div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Settings size={48} /></div><h3>No leave types</h3></div> :
                        types.map(lt => (
                            <div key={lt._id} className="card" style={{ opacity: lt.isActive ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${lt.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: lt.color }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lt.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{lt.code}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(lt)}><Edit size={14} /></button>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toggleActive(lt)} title={lt.isActive ? 'Deactivate' : 'Activate'}>
                                            {lt.isActive ? <ToggleRight size={18} color="var(--secondary)" /> : <ToggleLeft size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 13 }}>
                                    <div style={{ background: 'var(--bg-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Days</div>
                                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{lt.defaultDays}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Type</div>
                                        <div style={{ fontWeight: 600, color: lt.isPaid ? 'var(--secondary)' : 'var(--text-muted)' }}>{lt.isPaid ? 'Paid' : 'Unpaid'}</div>
                                    </div>
                                </div>
                                {lt.carryForward && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                                        Carry forward up to {lt.maxCarryForward} days
                                    </div>
                                )}
                                {lt.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{lt.description}</p>}
                            </div>
                        ))}
            </div>

            <Modal isOpen={modal.open} onClose={close} title={modal.mode === 'create' ? 'Add Leave Type' : 'Edit Leave Type'} size="md">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Name</label>
                            <input name="name" className="form-control" value={form.name} onChange={handleChange} placeholder="Annual Leave" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Code</label>
                            <input name="code" className="form-control" value={form.code} onChange={handleChange} placeholder="ANNUAL" required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Default Days</label>
                            <input name="defaultDays" type="number" min="0" className="form-control" value={form.defaultDays} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 44, height: 38, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 2 }} />
                                <input name="color" className="form-control" value={form.color} onChange={handleChange} style={{ flex: 1 }} />
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea name="description" className="form-control" rows={2} value={form.description} onChange={handleChange} placeholder="Brief description..." />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', margin: '4px 0 16px' }}>
                        {[{ name: 'isPaid', label: 'Paid Leave' }, { name: 'carryForward', label: 'Allow Carry Forward' }, { name: 'requiresApproval', label: 'Requires Approval' }].map(cb => (
                            <label key={cb.name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                <input type="checkbox" name={cb.name} checked={!!form[cb.name]} onChange={handleChange} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                                {cb.label}
                            </label>
                        ))}
                    </div>
                    {form.carryForward && (
                        <div className="form-group">
                            <label className="form-label">Max Carry Forward Days</label>
                            <input name="maxCarryForward" type="number" min="0" className="form-control" value={form.maxCarryForward} onChange={handleChange} />
                        </div>
                    )}
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Leave Type'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LeaveTypes;
