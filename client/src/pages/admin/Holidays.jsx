import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Palmtree, Edit } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const typeColors = { national: 'badge-rejected', regional: 'badge-pending', company: 'badge-approved', optional: 'badge-on-leave' };
const defaultForm = { name: '', date: '', type: 'national', description: '' };

const Holidays = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);

    const fetch = async () => {
        setLoading(true);
        try { const { data } = await api.get('/holidays', { params: { year: new Date().getFullYear() } }); setHolidays(data.holidays); }
        catch { toast.error('Failed'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);
    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (item) => { setForm({ ...defaultForm, ...item, date: new Date(item.date).toISOString().split('T')[0] }); setModal({ open: true, mode: 'edit', item }); };
    const close = () => setModal({ open: false, mode: 'create', item: null });
    const handleDel = async (id) => {
        if (!confirm('Delete this holiday?')) return;
        try { await api.delete(`/holidays/${id}`); toast.success('Holiday deleted'); fetch(); } catch { toast.error('Failed'); }
    };

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (modal.mode === 'create') { await api.post('/holidays', form); toast.success('Holiday added!'); }
            else { await api.put(`/holidays/${modal.item._id}`, form); toast.success('Holiday updated!'); }
            close(); fetch();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    return (
        <div className="fade-in">
            <div className="page-header"><h1>Company Holidays</h1><p>Manage official holidays for {new Date().getFullYear()}</p></div>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Holiday</button>
            </div>
            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead><tr><th>Holiday Name</th><th>Date</th><th>Day</th><th>Type</th><th>Description</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                holidays.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Palmtree size={48} /></div><h3>No holidays added</h3></div></td></tr> :
                                    holidays.map(h => (
                                        <tr key={h._id}>
                                            <td style={{ fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={14} color="var(--primary)" />{h.name}</div></td>
                                            <td style={{ fontFamily: 'monospace' }}>{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                                            <td><span className={`badge ${typeColors[h.type] || 'badge-pending'} `}>{h.type}</span></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{h.description || ''}</td>
                                            <td><div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(h)}><Edit size={14} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDel(h._id)}><Trash2 size={14} /></button>
                                            </div></td>
                                        </tr>
                                    ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={modal.open} onClose={close} title={modal.mode === 'create' ? 'Add Holiday' : 'Edit Holiday'} size="sm">
                <form onSubmit={handleSave}>
                    <div className="form-group"><label className="form-label required">Holiday Name</label><input name="name" className="form-control" value={form.name} onChange={handleChange} required /></div>
                    <div className="form-group"><label className="form-label required">Date</label><input type="date" name="date" className="form-control" value={form.date} onChange={handleChange} required /></div>
                    <div className="form-group"><label className="form-label">Type</label>
                        <select name="type" className="form-control" value={form.type} onChange={handleChange}>
                            <option value="national">National</option><option value="regional">Regional</option>
                            <option value="company">Company</option><option value="optional">Optional</option>
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Description</label><textarea name="description" className="form-control" rows={2} value={form.description} onChange={handleChange} /></div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Holidays;
