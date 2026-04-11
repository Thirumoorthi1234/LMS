import { Plus, Edit, Trash2, Search, CheckCircle, Clock, XCircle, User, UserPlus } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const EVENT_TYPES = {
    onboarding: { label: 'Onboarding', emoji: '', color: '#4F9CF9' },
    bgv: { label: 'Background Verification', emoji: '', color: '#8B5CF6' },
    confirmation: { label: 'Confirmation', emoji: '', color: '#10B981' },
    'salary-revision': { label: 'Salary Revision', emoji: '', color: '#F59E0B' },
    exit: { label: 'Exit', emoji: '', color: '#EF4444' },
    promotion: { label: 'Promotion', emoji: '', color: '#F97316' },
    transfer: { label: 'Transfer', emoji: '', color: '#06B6D4' },
    other: { label: 'Other', emoji: '', color: '#94A3B8' }
};
const STATUS_BADGE = {
    pending: 'badge-pending', 'in-progress': 'badge-pending',
    completed: 'badge-approved', cancelled: 'badge-cancelled'
};

const defaultForm = {
    employee: '', type: 'onboarding', date: new Date().toISOString().split('T')[0],
    status: 'pending', notes: '', details: {}
};

const Onboarding = () => {
    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEmp, setFilterEmp] = useState('');
    const [search, setSearch] = useState('');

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterType) params.type = filterType;
            if (filterStatus) params.status = filterStatus;
            if (filterEmp) params.employee = filterEmp;
            const { data } = await api.get('/lifecycle', { params });
            setEvents(data.events);
        } catch { toast.error('Failed to load lifecycle events'); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/users');
            setEmployees(data.users.filter(u => u.role === 'employee'));
        } catch { }
    };

    useEffect(() => { fetchEvents(); fetchEmployees(); }, []);
    useEffect(() => { fetchEvents(); }, [filterType, filterStatus, filterEmp]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (item) => {
        setForm({
            employee: item.employee?._id || '', type: item.type,
            date: item.date ? item.date.split('T')[0] : '', status: item.status, notes: item.notes || '', details: item.details || {}
        });
        setModal({ open: true, mode: 'edit', item });
    };
    const closeModal = () => setModal({ open: false, mode: 'create', item: null });

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.employee || !form.type || !form.date) { toast.error('Employee, type and date are required'); return; }
        setSaving(true);
        try {
            if (modal.mode === 'create') {
                await api.post('/lifecycle', form);
                toast.success('Lifecycle event created');
            } else {
                await api.put(`/lifecycle/${modal.item._id}`, form);
                toast.success('Event updated');
            }
            closeModal(); fetchEvents();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this event?')) return;
        try { await api.delete(`/lifecycle/${id}`); toast.success('Deleted'); fetchEvents(); }
        catch { toast.error('Failed to delete'); }
    };

    const filtered = events.filter(ev => {
        if (!search) return true;
        const q = search.toLowerCase();
        return ev.employee?.name?.toLowerCase().includes(q) || ev.notes?.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Employee Lifecycle Management</h1>
                <p>Track onboarding, BGV, confirmation, salary revision, and exit events</p>
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 200 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                    <option value="">All Employees</option>
                    {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
                <select className="form-control" style={{ width: 185 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Event Types</option>
                    {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
                <select className="form-control" style={{ width: 155 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Add Event</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Event Type</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th>Created By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>)
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><UserPlus size={48} /></div><h3>No lifecycle events found</h3><p>Start by adding an onboarding event for a new employee</p></div></td></tr>
                            ) : (
                                filtered.map(ev => {
                                    const meta = EVENT_TYPES[ev.type] || EVENT_TYPES.other;
                                    return (
                                        <tr key={ev._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <User size={14} color={meta.color} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.employee?.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.employee?.department}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span>{meta.emoji}</span>
                                                    <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                {ev.date ? new Date(ev.date).toLocaleDateString('en-IN') : ''}
                                            </td>
                                            <td><span className={`badge ${STATUS_BADGE[ev.status] || 'badge-pending'}`}><span className="badge-dot" />{ev.status}</span></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.notes || ''}</div>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ev.createdBy?.name || ''}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(ev)} title="Edit"><Edit size={14} /></button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(ev._id)} title="Delete"><Trash2 size={14} /></button>
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

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Add Lifecycle Event' : 'Edit Lifecycle Event'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Employee</label>
                            <select className="form-control" value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} required disabled={modal.mode === 'edit'}>
                                <option value="">Select Employee</option>
                                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}  {emp.department || 'N/A'}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Event Type</label>
                            <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Event Date</label>
                            <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add notes about this lifecycle event..." />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'create' ? 'Create Event' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Onboarding;
