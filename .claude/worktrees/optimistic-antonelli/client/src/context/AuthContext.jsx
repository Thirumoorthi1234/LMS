import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('lms_user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('lms_token'));
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    // Keep axios up to date whenever token changes
    useEffect(() => {
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        else delete api.defaults.headers.common['Authorization'];
    }, [token]);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('lms_token', data.token);
            localStorage.setItem('lms_user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return { success: true, role: data.user.role };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Login failed' };
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('lms_token');
        localStorage.removeItem('lms_user');
        setToken(null);
        setUser(null);
    }, []);

    // Listen for forced logout triggered by axios 401 interceptor
    useEffect(() => {
        const handleForceLogout = () => {
            localStorage.removeItem('lms_token');
            localStorage.removeItem('lms_user');
            setToken(null);
            setUser(null);
            navigateRef.current('/login');
        };
        window.addEventListener('auth:logout', handleForceLogout);
        return () => window.removeEventListener('auth:logout', handleForceLogout);
    }, []);

    const updateUser = useCallback((updatedUser) => {
        const newUser = { ...user, ...updatedUser };
        localStorage.setItem('lms_user', JSON.stringify(newUser));
        setUser(newUser);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
