import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', department: user?.department || '', position: user?.position || '' });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [savingPw, setSavingPw] = useState(false);

    const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const handlePwChange = (e) => setPwForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const { data } = await api.put(`/users/${user._id}/profile`, form);
            updateUser(data.user);
            toast.success('Profile updated!');
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handlePwSave = async (e) => {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
        if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setSavingPw(true);
        try {
            await api.put(`/users/${user._id}/change-password`, { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            toast.success('Password changed!');
            setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSavingPw(false); }
    };

    return (
        <div className="fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
            <div className="page-header"><h1>My Profile</h1><p>Manage your account information and password</p></div>

            {/* Profile Card */}
            <div className="card" style={{ marginBottom: 20 }}>
                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 800, color: 'white', flexShrink: 0
                    }}>{initials(user?.name)}</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{user?.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user?.email}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <span className="badge badge-present" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                            {user?.employeeId && <span className="badge badge-pending">{user.employeeId}</span>}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px 24px', marginBottom: 20, padding: 16, background: 'var(--bg-light)', borderRadius: 'var(--radius)' }}>
                    {[
                        { label: 'Department', value: user?.department },
                        { label: 'Position', value: user?.position },
                        { label: 'Phone', value: user?.phone },
                        { label: 'Joined', value: user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : '' },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value || ''}</div>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSave}>
                    <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} />Edit Profile</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input name="name" className="form-control" value={form.name} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input name="phone" className="form-control" value={form.phone} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <input name="department" className="form-control" value={form.department} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Position</label>
                            <input name="position" className="form-control" value={form.position} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}</button>
                    </div>
                </form>
            </div>

            {/* Change Password */}
            <div className="card">
                <form onSubmit={handlePwSave}>
                    <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={16} />Change Password</div>
                    <div className="form-group">
                        <label className="form-label required">Current Password</label>
                        <input name="currentPassword" type="password" className="form-control" value={pwForm.currentPassword} onChange={handlePwChange} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">New Password</label>
                            <input name="newPassword" type="password" className="form-control" value={pwForm.newPassword} onChange={handlePwChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Confirm Password</label>
                            <input name="confirm" type="password" className="form-control" value={pwForm.confirm} onChange={handlePwChange} required />
                        </div>
                    </div>
                    {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
                        <div className="form-error" style={{ marginBottom: 12 }}>Passwords do not match</div>
                    )}
                    <div className="form-actions">
                        <button type="submit" className="btn btn-secondary" disabled={savingPw}><Lock size={14} /> {savingPw ? 'Changing...' : 'Change Password'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
