import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const AppLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'mobile-open' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
                <Header
                    onMenuClick={() => {
                        if (window.innerWidth <= 768) setMobileOpen(true);
                        else setCollapsed(c => !c);
                    }}
                />
                <main className="page-content">
                    <div className="animate-soft-slide">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
