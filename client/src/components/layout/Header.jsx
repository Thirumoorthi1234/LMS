import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const pageTitles = {
    '/admin/dashboard': { title: 'Dashboard', sub: 'Welcome back, here\'s what\'s happening' },
    '/admin/employees': { title: 'Employees', sub: 'Manage your team members' },
    '/admin/leave-requests': { title: 'Leave Requests', sub: 'Review and manage leave applications' },
    '/admin/leave-types': { title: 'Leave Types & Policies', sub: 'Configure leave policies' },
    '/admin/attendance': { title: 'Attendance Records', sub: 'Track employee attendance' },
    '/admin/holidays': { title: 'Company Holidays', sub: 'Manage holiday calendar' },
    '/admin/reports': { title: 'Reports & Analytics', sub: 'Export and analyze data' },
    '/admin/notifications': { title: 'Notifications', sub: 'Stay updated' },
    '/hr/dashboard': { title: 'HR Dashboard', sub: 'HR portal overview and activity' },
    '/hr/employees': { title: 'Employee Management', sub: 'Manage employees and their profiles' },
    '/hr/leave-requests': { title: 'Leave Requests', sub: 'Review and manage leave applications' },
    '/hr/leave-types': { title: 'Leave Types & Policies', sub: 'Configure leave policies' },
    '/hr/attendance': { title: 'Attendance Records', sub: 'Track employee attendance' },
    '/hr/holidays': { title: 'Company Holidays', sub: 'Manage holiday calendar' },
    '/hr/reports': { title: 'Reports & Analytics', sub: 'Export and analyze data' },
    '/hr/payroll': { title: 'Payroll & Payslips', sub: 'Manage employee payroll' },
    '/hr/notifications': { title: 'Notifications', sub: 'Stay updated' },
    '/hr/appraisals': { title: 'Appraisals', sub: 'Manage employee performance appraisals' },
    '/employee/dashboard': { title: 'My Dashboard', sub: 'Your leave and attendance overview' },
    '/employee/profile': { title: 'My Profile', sub: 'View and update your information' },
    '/employee/apply-leave': { title: 'Apply for Leave', sub: 'Submit a new leave request' },
    '/employee/leave-history': { title: 'Leave History', sub: 'Track your leave requests' },
    '/employee/attendance': { title: 'My Attendance', sub: 'Check in and track your attendance' },
    '/employee/holidays': { title: 'Holiday Calendar', sub: 'View upcoming company holidays' },
    '/employee/notifications': { title: 'Notifications', sub: 'Your latest updates' },
};


const Header = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const pageInfo = pageTitles[location.pathname] || { title: 'Learnlike', sub: '' };
    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const { data } = await api.get('/notifications');
                setUnread(data.unreadCount || 0);
            } catch { }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };
    const goNotifications = () => navigate(`/${user?.role}/notifications`);

    return (
        <header className="header">
            <button className="header-btn" onClick={onMenuClick} title="Toggle sidebar">
                <Menu size={20} />
            </button>
            <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {pageInfo.title !== 'Learnlike' && (
                    <>
                        <div>
                            <h2>{pageInfo.title}</h2>
                            <p>{pageInfo.sub}</p>
                        </div>
                    </>
                )}
            </div>
            <div className="header-actions">
                <button className="header-btn" onClick={goNotifications} title="Notifications">
                    <Bell size={20} />
                    {unread > 0 && <span className="notif-badge" />}
                </button>
                <div className="user-avatar-btn">
                    <div className="user-avatar">{initials}</div>
                    <div className="user-info">
                        <div className="user-name">{user?.name}</div>
                        <div className="user-role">{user?.role}</div>
                    </div>
                </div>
                <button className="header-btn" onClick={handleLogout} title="Logout">
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
};

export default Header;
