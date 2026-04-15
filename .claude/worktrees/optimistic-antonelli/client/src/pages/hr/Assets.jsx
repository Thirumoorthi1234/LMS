import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Laptop, Smartphone, Monitor, Package, Search } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
    laptop: Laptop, mobile: Smartphone, monitor: Monitor, tablet: Smartphone,
    keyboard: Package, mouse: Package, headset: Package, other: Package
};
const TYPE_LABELS = {
    laptop: 'Laptop', mobile: 'Mobile', monitor: 'Monitor', tablet: 'Tablet',
    keyboard: 'Keyboard', mouse: 'Mouse', headset: 'Headset', other: 'Other'
};
const STATUS_BADGE = {
    available: 'badge-approved', assigned: 'badge-pending', returned: 'badge-cancelled',
    damaged: 'badge-cancelled', retired: 'badge-cancelled'
};

const defaultForm = { name: '', type: 'laptop', serialNumber: '', brand: '', model: '', purchaseValue: '', status: 'available', notes: '', assignedTo: '' };

const Assets = () => {
    const { user } = useAuth();
    const [assets, setAssets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [search, setSearch] = useState('');

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterType) params.type = filterType;
            const { data } = await api.get('/assets', { params });
            setAssets(data.assets);
        } catch { toast.error('Failed to load assets'); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/users');
            setEmployees(data.users.filter(u => u.role === 'employee' && u.isActive));
        } catch { }
    };

    useEffect(() => { fetchAssets(); fetchEmployees(); }, []);
    useEffect(() => { fetchAssets(); }, [filterStatus, filterType]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (item) => {
        setForm({
            name: item.name, type: item.type, serialNumber: item.serialNumber || '',
            brand: item.brand || '', model: item.model || '',
            purchaseValue: item.purchaseValue || '', status: item.status,
            notes: item.notes || '', assignedTo: item.assignedTo?._id || ''
        });
        setModal({ open: true, mode: 'edit', item });
    };
    const closeModal = () => setModal({ open: false, mode: 'create', item: null });

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name) { toast.error('Asset name is required'); return; }
        setSaving(true);
        try {
            const payload = { ...form };
            if (payload.assignedTo && payload.status === 'assigned') {
                // keep assignedTo
            } else if (!payload.assignedTo) {
                delete payload.assignedTo;
            }
            if (modal.mode === 'create') {
                await api.post('/assets', payload);
                toast.success('Asset created');
            } else {
                await api.put(`/assets/${modal.item._id}`, payload);
                toast.success('Asset updated');
            }
            closeModal(); fetchAssets();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this asset?')) return;
        try { await api.delete(`/assets/${id}`); toast.success('Deleted'); fetchAssets(); }
        catch { toast.error('Failed to delete'); }
    };

    const filtered = assets.filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return a.name?.toLowerCase().includes(q) || a.serialNumber?.toLowerCase().includes(q) || a.assignedTo?.name?.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Asset Management</h1>
                <p>Track and manage company assets assigned to employees</p>
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="returned">Returned</option>
                    <option value="damaged">Damaged</option>
                </select>
                <select className="form-control" style={{ width: 150 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Add Asset</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Type</th>
                                <th>Serial / Brand</th>
                                <th>Assigned To</th>
                                <th>Value</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Laptop size={48} /></div><h3>No assets found</h3><p>Add company assets to start tracking</p></div></td></tr>
                            ) : (
                                filtered.map(a => {
                                    const Icon = TYPE_ICONS[a.type] || Package;
                                    return (
                                        <tr key={a._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Icon size={16} color="var(--primary)" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.model || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span style={{ textTransform: 'capitalize', fontSize: 13 }}>{TYPE_LABELS[a.type]}</span></td>
                                            <td>
                                                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{a.serialNumber || ''}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.brand || ''}</div>
                                            </td>
                                            <td>
                                                {a.assignedTo ? (
                                                    <div>
                                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{a.assignedTo.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.assignedTo.department}</div>
                                                    </div>
                                                ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unassigned</span>}
                                            </td>
                                            <td style={{ fontSize: 13, fontWeight: 500 }}>{a.purchaseValue ? `${Number(a.purchaseValue).toLocaleString()}` : ''}</td>
                                            <td><span className={`badge ${STATUS_BADGE[a.status] || 'badge-pending'}`}><span className="badge-dot" />{a.status}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(a)} title="Edit"><Edit size={14} /></button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(a._id)} title="Delete"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Add Asset' : 'Edit Asset'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Asset Name</label>
                            <input className="form-control" placeholder="e.g. Dell Laptop #1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Brand</label>
                            <input className="form-control" placeholder="e.g. Dell, Apple" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Model</label>
                            <input className="form-control" placeholder="e.g. XPS 15" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Serial Number</label>
                            <input className="form-control" placeholder="Serial / IMEI" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Purchase Value ()</label>
                            <input className="form-control" type="number" min="0" placeholder="0" value={form.purchaseValue} onChange={e => setForm(f => ({ ...f, purchaseValue: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="available">Available</option>
                                <option value="assigned">Assigned</option>
                                <option value="returned">Returned</option>
                                <option value="damaged">Damaged</option>
                                <option value="retired">Retired</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Assign To Employee</label>
                            <select className="form-control" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value, status: e.target.value ? 'assigned' : f.status }))}>
                                <option value=""> Unassigned </option>
                                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.department || 'N/A'})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'create' ? 'Add Asset' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Assets;
