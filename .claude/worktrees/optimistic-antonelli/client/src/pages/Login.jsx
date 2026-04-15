import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import logo from '../assets/logo.svg';

const Login = () => {
    const { login, loading } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [show, setShow] = useState(false);
    const [err, setErr] = useState('');

    const handleChange = (e) => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setErr('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) { setErr('Please fill in all fields'); return; }
        const result = await login(form.email, form.password);
        if (result.success) {
            toast.success(`Welcome back! Logged in as ${result.role}`);
            navigate(`/${result.role}/dashboard`);
        } else {
            setErr(result.message);
            toast.error(result.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo animate-soft-slide stagger-1">
                    <img src={logo} alt="Learnlike Logo" style={{ height: '100px', width: 'auto', marginBottom: '8px' }} className="animate-soft-reveal stagger-1" />
                    <p>Leave Management System</p>
                </div>

                <form onSubmit={handleSubmit} className="animate-soft-slide stagger-2">
                    <div className="form-group">
                        <label className="form-label required">Email Address</label>
                        <input
                            name="email" type="email" className="form-control"
                            placeholder="Enter your email"
                            value={form.email} onChange={handleChange}
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                name="password" type={show ? 'text' : 'password'} className="form-control"
                                placeholder="Enter your password"
                                value={form.password} onChange={handleChange}
                                style={{ paddingRight: '44px' }}
                                autoComplete="current-password"
                            />
                            <button
                                type="button" onClick={() => setShow(s => !s)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                {show ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    {err && <div className="form-error animate-soft-reveal" style={{ marginBottom: '12px', padding: '10px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>{err}</div>}
                    <button type="submit" className="btn btn-primary w-full btn-lg shimmer-active glow-on-hover" disabled={loading} style={{ width: '100%', marginTop: '4px', height: '52px' }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                Signing in...
                            </span>
                        ) : (
                            <><LogIn size={18} /> Sign In</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
