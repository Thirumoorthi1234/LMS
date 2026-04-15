import React, { useEffect, useState } from 'react';
import { Search, Phone, Mail, Building2, Briefcase, Users } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Directory = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const navigate = useNavigate();

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (filterDept) params.department = filterDept;
            const { data } = await api.get('/users', { params });
            setEmployees(data.users.filter(u => u.isActive));
        } catch { toast.error('Failed to load directory'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEmployees(); }, [filterDept]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchEmployees();
    };

    const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();

    const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
    const AVATAR_COLORS = ['#4F9CF9', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];
    const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Employee Directory</h1>
                <p>Find and connect with your colleagues</p>
            </div>

            <div className="filter-bar">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-control" style={{ width: 180 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm"><Search size={14} /> Search</button>
                </form>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {Array(8).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 140 }} />)}
                </div>
            ) : employees.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Users size={48} /></div><h3>No employees found</h3><p>Try a different search</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {employees.map(emp => (
                        <div key={emp._id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.2s, box-shadow 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {emp.avatar ? (
                                    <img src={emp.avatar} alt={emp.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: getColor(emp.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                                        {getInitials(emp.name)}
                                    </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, textTransform: 'capitalize' }}>{emp.role}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {emp.position && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><Briefcase size={13} />{emp.position}</div>}
                                {emp.department && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><Building2 size={13} />{emp.department}</div>}
                                {emp.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}><Mail size={13} />{emp.email}</div>}
                                {emp.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}><Phone size={13} />{emp.phone}</div>}
                            </div>
                            <a href={`mailto:${emp.email}`} className="btn btn-secondary btn-sm" style={{ textAlign: 'center', marginTop: 'auto' }}>
                                <Mail size={13} /> Send Email
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Directory;
