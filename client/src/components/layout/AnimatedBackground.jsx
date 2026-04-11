import React from 'react';

const AnimatedBackground = () => (
    <div className="app-bg" aria-hidden="true">
        {/* Large slow blobs */}
        <div className="floating-shape" style={{ background: 'rgba(155, 124, 253, 0.15)', width: '800px', height: '800px', top: '-300px', right: '-100px', animationDuration: '25s' }} />
        <div className="floating-shape" style={{ background: 'rgba(217, 70, 239, 0.12)', width: '600px', height: '600px', bottom: '-200px', left: '-200px', animationDuration: '30s', animationDelay: '-5s' }} />

        {/* Medium dynamic blobs */}
        <div className="floating-shape" style={{ background: 'rgba(139, 92, 246, 0.1)', width: '400px', height: '400px', top: '20%', left: '10%', animationDuration: '18s', animationDelay: '-2s' }} />
        <div className="floating-shape" style={{ background: 'rgba(236, 72, 153, 0.08)', width: '350px', height: '350px', bottom: '20%', right: '15%', animationDuration: '22s', animationDelay: '-8s' }} />

        {/* Small accent blobs */}
        <div className="floating-shape" style={{ background: 'rgba(155, 124, 253, 0.2)', width: '200px', height: '200px', top: '50%', right: '40%', animationDuration: '15s', animationDelay: '-10s' }} />
        <div className="floating-shape" style={{ background: 'rgba(217, 70, 239, 0.15)', width: '150px', height: '150px', bottom: '40%', left: '40%', animationDuration: '12s', animationDelay: '-4s' }} />
    </div>
);

export default AnimatedBackground;
