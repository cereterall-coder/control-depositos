import React from 'react';

export default function AppDebug() {
    return (
        <div style={{ padding: '2rem', background: '#222', color: '#0f0', height: '100vh', fontFamily: 'monospace' }}>
            <h1>✅ DIAGNOSTICO DE SISTEMA</h1>
            <p>Si puedes leer esto, React y Vite están funcionando correctamente.</p>
            <p>El problema reside en App.jsx o sus dependencias.</p>
        </div>
    );
}
