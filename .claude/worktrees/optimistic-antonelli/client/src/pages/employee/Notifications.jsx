import React, { useEffect, useState } from 'react';
import { Bell, Clock, Calendar, CheckCircle, Info, AlertTriangle, ArrowRight, CheckCheck, FileText, XCircle } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const typeIcons = {
    leave_applied: <FileText size={16} />,
    leave_approved: <CheckCircle size={16} />,
    leave_rejected: <XCircle size={16} />,
    leave_cancelled: <XCircle size={16} />,
    attendance: <Clock size={16} />,
    general: <Info size={16} />
};
const typeColors = {
    leave_applied: 'var(--primary-light)', leave_approved: 'var(--secondary-light)',
    leave_rejected: 'var(--danger-light)', leave_cancelled: 'var(--bg-light)',
    attendance: 'var(--purple-light)', general: 'var(--bg-light)'
};

const Notifications = () => {
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        setLoading(true);
        try { const { data } = await api.get('/notifications'); setNotifs(data.notifications); }
        catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const markRead = async (id) => {
        await api.put(`/notifications/${id}/read`);
        setNotifs(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
    };

    const markAll = async () => {
        await api.put('/notifications/read-all');
        setNotifs(n => n.map(x => ({ ...x, isRead: true })));
        toast.success('All marked as read');
    };

    const timeAgo = (d) => {
        const diff = Date.now() - new Date(d);
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return Math.floor(h / 24) + 'd ago';
    };

    const unread = notifs.filter(n => !n.isRead).length;

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>Notifications {unread > 0 && <span style={{ fontSize: '1rem', background: 'var(--danger)', color: 'white', padding: '2px 10px', borderRadius: 20, marginLeft: 8, verticalAlign: 'middle' }}>{unread}</span>}</h1>
                    <p>Stay updated with your leave activities</p>
                </div>
                {unread > 0 && <button className="btn btn-secondary btn-sm" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}
            </div>

            {loading ? (
                Array(5).fill(0).map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ height: 80, marginBottom: 8 }} />)
            ) : notifs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div className="empty-state-icon" style={{ color: 'var(--text-muted)', marginBottom: 16 }}><Bell size={48} /></div>
                    <h3>No notifications yet</h3>
                    <p>You'll see updates about your leave requests here</p>
                </div>
            ) : (
                notifs.map(n => (
                    <div key={n._id} className={`notif-item${n.isRead ? '' : ' unread'}`}
                        onClick={() => !n.isRead && markRead(n._id)}
                        style={{ cursor: n.isRead ? 'default' : 'pointer' }}
                    >
                        <div className="notif-icon" style={{ background: typeColors[n.type] || 'var(--bg-light)' }}>
                            <span style={{ fontSize: 20 }}>{typeIcons[n.type] || ''}</span>
                        </div>
                        <div className="notif-content">
                            <div className="notif-title">{n.title}</div>
                            <p className="notif-msg">{n.message}</p>
                            <div className="notif-time">{timeAgo(n.createdAt)}</div>
                        </div>
                        {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 8 }} />}
                    </div>
                ))
            )}
        </div>
    );
};

export default Notifications;
