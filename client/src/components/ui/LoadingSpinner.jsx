import React from 'react';

const LoadingSpinner = ({ size = 32, color = '#4F9CF9' }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox="0 0 50 50" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray="80 60" />
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </svg>
    </div>
);

export default LoadingSpinner;
