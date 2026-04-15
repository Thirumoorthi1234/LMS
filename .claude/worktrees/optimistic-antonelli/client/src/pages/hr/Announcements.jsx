import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Pin, Megaphone, Calendar, Search } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_META = {
    announcement: { label: 'Announcement', emoji: '', color: '#4F9CF9' },
    event: { label: 'Event', emoji: '', color: '#8B5CF6' },
    birthday: { label: 'Birthday', emoji: '', color: '#EC4899' },
    anniversary: { label: 'Anniversary', emoji: '', color: '#F59E0B' },
    policy: { label: 'Policy', emoji: '', color: '#10B981' },
    alert: { label: 'Alert', emoji: '', color: '#EF4444' }
};

const defaultForm = { title: '', content: '', type: 'announcement', audience: 'all', pinned: false };

const Announcements = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [search, setSearch] = useState('');

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterType) params.type = filterType;
            const { data } = await api.get('/announcements', { params });
            setItems(data.announcements);
        } catch { toast.error('Failed to load announcements'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAnnouncements(); }, []);
    useEffect(() => { fetchAnnouncements(); }, [filterType]);

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, mode: 'create', item: null }); };
    const openEdit = (item) => {
        setForm({ title: item.title, content: item.content, type: item.type, audience: item.audience, pinned: item.pinned });
        setModal({ open: true, mode: 'edit', item });
    };
    const closeModal = () => setModal({ open: false, mode: 'create', item: null });

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
        setSaving(true);
        try {
            if (modal.mode === 'create') {
                await api.post('/announcements', form);
                toast.success('Announcement posted!');
            } else {
                await api.put(`/announcements/${modal.item._id}`, form);
                toast.success('Updated!');
            }
            closeModal(); fetchAnnouncements();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try { await api.delete(`/announcements/${id}`); toast.success('Deleted'); fetchAnnouncements(); }
        catch { toast.error('Failed to delete'); }
    };

    const togglePin = async (item) => {
        try {
            await api.put(`/announcements/${item._id}`, { ...item, pinned: !item.pinned, postedBy: item.postedBy?._id });
            fetchAnnouncements();
        } catch { toast.error('Failed to update'); }
    };

    const filtered = items.filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Announcements & Bulletin Board</h1>
                <p>Post company-wide announcements, events, and communications</p>
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search announcements..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 170 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> New Post</button>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gap: 14 }}>
                    {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 100 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Megaphone size={48} /></div><h3>No announcements yet</h3><p>Post your first company announcement</p></div></div>
            ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                    {/* Pinned first */}
                    {filtered.filter(a => a.pinned).concat(filtered.filter(a => !a.pinned)).map(item => {
                        const meta = TYPE_META[item.type] || TYPE_META.announcement;
                        return (
                            <div key={item._id} className="card" style={{ border: item.pinned ? `2px solid ${meta.color}` : '1px solid var(--border)', padding: '18px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{meta.emoji}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                            {item.pinned && <Pin size={13} color={meta.color} style={{ flexShrink: 0 }} />}
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{item.title}</h3>
                                            <span style={{ fontSize: 11, background: `${meta.color}20`, color: meta.color, padding: '2px 8px', borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>{meta.label}</span>
                                        </div>
                                        <p style={{ margin: '4px 0 8px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{item.content}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                                            <span> {item.postedBy?.name || 'HR'}</span>
                                            <span> Audience: {item.audience}</span>
                                            <span> {new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => togglePin(item)} title={item.pinned ? 'Unpin' : 'Pin'} style={{ color: item.pinned ? meta.color : undefined }}>
                                            <Pin size={14} />
                                        </button>
                                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(item)} title="Edit"><Edit size={14} /></button>
                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(item._id)} title="Delete"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Announcement' : 'Edit Announcement'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Type</label>
                            <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Audience</label>
                            <select className="form-control" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                                <option value="all">All</option>
                                <option value="employee">Employees Only</option>
                                <option value="hr">HR Only</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Title</label>
                        <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title..." required />
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Content</label>
                        <textarea className="form-control" rows={5} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your announcement..." required />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" id="pinnedChk" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} style={{ width: 16, height: 16 }} />
                        <label htmlFor="pinnedChk" style={{ margin: 0, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}> Pin this announcement to top</label>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting...' : modal.mode === 'create' ? 'Post Announcement' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Announcements;
