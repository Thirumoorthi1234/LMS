import React, { useEffect, useState } from 'react';
import { Pin, Newspaper } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const TYPE_META = {
    announcement: { label: 'Announcement', emoji: '', color: '#4F9CF9', bg: '#EFF6FF' },
    event: { label: 'Event', emoji: '', color: '#8B5CF6', bg: '#F5F3FF' },
    birthday: { label: 'Birthday', emoji: '', color: '#EC4899', bg: '#FDF2F8' },
    anniversary: { label: 'Anniversary', emoji: '', color: '#F59E0B', bg: '#FFFBEB' },
    policy: { label: 'Policy', emoji: '', color: '#10B981', bg: '#ECFDF5' },
    alert: { label: 'Alert', emoji: '', color: '#EF4444', bg: '#FEF2F2' }
};

const SocialFeed = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');

    const fetchFeed = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterType) params.type = filterType;
            const { data } = await api.get('/announcements', { params });
            setItems(data.announcements);
        } catch { toast.error('Failed to load feed'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFeed(); }, [filterType]);

    // Group pinned at top, then by date
    const pinned = items.filter(a => a.pinned);
    const rest = items.filter(a => !a.pinned);
    const all = [...pinned, ...rest];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Company Feed</h1>
                <p>Stay updated with company news, events, and celebrations</p>
            </div>

            {/* Type filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button className={`btn btn-sm ${filterType === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType('')}>All</button>
                {Object.entries(TYPE_META).map(([k, v]) => (
                    <button key={k} className={`btn btn-sm ${filterType === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType(filterType === k ? '' : k)}>
                        {v.emoji} {v.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Array(5).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 120 }} />)}
                </div>
            ) : all.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Newspaper size={48} /></div><h3>No posts yet</h3><p>Company announcements will appear here</p></div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {all.map(item => {
                        const meta = TYPE_META[item.type] || TYPE_META.announcement;
                        return (
                            <div key={item._id} className="card" style={{ padding: '20px 22px', borderLeft: `4px solid ${meta.color}`, background: item.pinned ? meta.bg : undefined }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{meta.emoji}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                            {item.pinned && <Pin size={13} color={meta.color} />}
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>{item.title}</h3>
                                            <span style={{ fontSize: 11, background: `${meta.color}20`, color: meta.color, padding: '2px 8px', borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>{meta.label}</span>
                                        </div>
                                        <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{item.content}</p>
                                        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                                            <span>Posted by {item.postedBy?.name || 'HR'}</span>
                                            <span></span>
                                            <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SocialFeed;
