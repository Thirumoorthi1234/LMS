import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach stored token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('lms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            // Dispatch a custom event so AuthContext can handle logout
            // cleanly via React state (avoids a full page reload)
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(err);
    }
);

export default api;
