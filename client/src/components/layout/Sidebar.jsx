import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, FileText, CalendarDays, Clock,
    Gift, BarChart3, Bell, LogOut, ChevronLeft, ChevronRight,
    Settings, UserCircle, PlusCircle, History, X, Banknote, Star,
    Laptop, FileCheck, Megaphone, LifeBuoy, BookOpen, BookMarked,
    Newspaper, Phone, Briefcase, ListTodo, Clock3, ShieldAlert, Bug, BarChart2, Users2, ClipboardList
} from 'lucide-react';

const adminLinks = [
    {
        section: 'Main', links: [
            { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/admin/employees', icon: Users, label: 'Employees' },
        ]
    },
    {
        section: 'Leave', links: [
            { to: '/admin/leave-requests', icon: FileText, label: 'Leave Requests' },
            { to: '/admin/leave-types', icon: Settings, label: 'Leave Types' },
        ]
    },
    {
        section: 'Attendance & Time', links: [
            { to: '/admin/attendance', icon: Clock, label: 'Attendance' },
            { to: '/admin/holidays', icon: Gift, label: 'Holidays' },
        ]
    },
    {
        section: 'Analytics & Payroll', links: [
            { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
            { to: '/admin/payroll', icon: Banknote, label: 'Payroll & Payslips' },
            { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
        ]
    },
    {
        section: 'HRMS Modules', links: [
            { to: '/admin/assets', icon: Laptop, label: 'Asset Management' },
            { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
        ]
    },
];

const hrLinks = [
    {
        section: 'Main', links: [
            { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/hr/employees', icon: Users, label: 'Employees' },
            { to: '/hr/appraisals', icon: Star, label: 'Appraisals' },
        ]
    },
    {
        section: 'Leave', links: [
            { to: '/hr/leave-requests', icon: FileText, label: 'Leave Requests' },
            { to: '/hr/leave-types', icon: Settings, label: 'Leave Types' },
        ]
    },
    {
        section: 'Attendance & Time', links: [
            { to: '/hr/attendance', icon: Clock, label: 'Attendance' },
            { to: '/hr/holidays', icon: Gift, label: 'Holidays' },
        ]
    },
    {
        section: 'Analytics & Payroll', links: [
            { to: '/hr/reports', icon: BarChart3, label: 'Reports' },
            { to: '/hr/payroll', icon: Banknote, label: 'Payroll & Payslips' },
            { to: '/hr/notifications', icon: Bell, label: 'Notifications' },
        ]
    },
    {
        section: 'HRMS Modules', links: [
            { to: '/hr/lifecycle', icon: BookOpen, label: 'Lifecycle / Onboarding' },
            { to: '/hr/assets', icon: Laptop, label: 'Asset Management' },
            { to: '/hr/documents', icon: FileCheck, label: 'Documents' },
            { to: '/hr/announcements', icon: Megaphone, label: 'Announcements' },
            { to: '/hr/helpdesk', icon: LifeBuoy, label: 'HelpDesk' },
            { to: '/hr/pm-appraisals', icon: ClipboardList, label: 'PM Appraisals' },
        ]
    },
];

const employeeLinks = [
    {
        section: 'Main', links: [
            { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/employee/profile', icon: UserCircle, label: 'My Profile' },
        ]
    },
    {
        section: 'Leave', links: [
            { to: '/employee/apply-leave', icon: PlusCircle, label: 'Apply Leave' },
            { to: '/employee/leave-history', icon: History, label: 'Leave History' },
        ]
    },
    {
        section: 'Attendance', links: [
            { to: '/employee/attendance', icon: Clock, label: 'Attendance' },
            { to: '/employee/holidays', icon: CalendarDays, label: 'Holiday Calendar' },
        ]
    },
    {
        section: 'Financials & More', links: [
            { to: '/employee/payroll', icon: Banknote, label: 'My Payslips' },
            { to: '/employee/notifications', icon: Bell, label: 'Notifications' },
        ]
    },
    {
        section: 'Self Service', links: [
            { to: '/employee/directory', icon: Phone, label: 'Employee Directory' },
            { to: '/employee/feed', icon: Newspaper, label: 'Company Feed' },
            { to: '/employee/documents', icon: BookMarked, label: 'My Documents' },
            { to: '/employee/helpdesk', icon: LifeBuoy, label: 'HR HelpDesk' },
            { to: '/employee/pm-appraisal', icon: ClipboardList, label: 'My Appraisal' },
        ]
    },
];

const pmLinks = [
    {
        section: 'PM Main', links: [
            { to: '/pm/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/pm/projects', icon: Briefcase, label: 'Projects' },
            { to: '/pm/tasks', icon: ListTodo, label: 'Tasks' },
            { to: '/pm/team', icon: Users2, label: 'Team' },
        ]
    },
    {
        section: 'Tracking', links: [
            { to: '/pm/timesheets', icon: Clock3, label: 'Timesheets' },
            { to: '/pm/risks', icon: ShieldAlert, label: 'Risks' },
            { to: '/pm/issues', icon: Bug, label: 'Issue Tracker' },
        ]
    },
    {
        section: 'Analytics', links: [
            { to: '/pm/reports', icon: BarChart2, label: 'Reports' },
            { to: '/pm/appraisals', icon: ClipboardList, label: 'Appraisals' },
        ]
    },
];

const clientLinks = [
    {
        section: 'My Projects', links: [
            { to: '/client/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/client/projects', icon: Briefcase, label: 'My Projects' },
        ]
    },
];

import logo from '../../assets/logo.svg';



const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen, unreadCount = 0 }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    let links = employeeLinks;
    if (user?.role === 'admin') links = adminLinks;
    if (user?.role === 'hr') links = hrLinks;
    if (user?.role === 'pm') links = pmLinks;
    if (user?.role === 'client') links = clientLinks;

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-logo">
                <div className="sidebar-logo-img-wrapper">
                    <img src={logo} alt="Learnlike Logo" />
                </div>
                <button className="mobile-close-btn" onClick={() => setMobileOpen(false)}>
                    <X size={18} />
                </button>
            </div>
            <nav className="sidebar-nav">
                {links.map(({ section, links: slinks }) => (
                    <div className="sidebar-section" key={section}>
                        <div className="sidebar-section-title">{section}</div>
                        {slinks.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to} to={to}
                                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon size={18} className="sidebar-link-icon" />
                                <span className="sidebar-link-label">{label}</span>
                                {label === 'Notifications' && unreadCount > 0 && (
                                    <span className="sidebar-link-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer">
                <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%' }}>
                    <LogOut size={18} className="sidebar-link-icon" />
                    <span className="sidebar-link-label">Logout</span>
                </button>
                <div className="sidebar-toggle-wrapper" style={{ display: window.innerWidth > 768 ? 'block' : 'none' }}>
                    <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        {!collapsed && <span>Collapse</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
