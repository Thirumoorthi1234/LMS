import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, role, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Support both single role and allowedRoles array
    const roles = allowedRoles || (role ? [role] : null);
    if (roles && !roles.includes(user?.role)) {
        let target = '/employee/dashboard';
        if (user?.role === 'admin') target = '/admin/dashboard';
        if (user?.role === 'hr') target = '/hr/dashboard';
        if (user?.role === 'pm') target = '/pm/dashboard';
        if (user?.role === 'client') target = '/client/dashboard';
        if (user?.role === 'developer') target = '/employee/dashboard';
        return <Navigate to={target} replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
