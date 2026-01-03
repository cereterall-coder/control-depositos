import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, Shield, Lock } from 'lucide-react';

const DashboardLayout = ({ children, title, notificationCount = 0 }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showProfile, setShowProfile] = useState(false);

    return (
        <div className="app-container">
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onMouseEnter={() => setShowProfile(true)}
                        onMouseLeave={() => setShowProfile(false)}
                        onClick={() => setShowProfile(!showProfile)}
                    >
                        <div style={{
                            width: '48px', height: '48px',
                            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                            background: 'url(/pwa-192x192.png) center/cover no-repeat, linear-gradient(135deg, var(--color-primary), #0f172a)',
                            filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.4))',
                            transition: 'transform 0.2s',
                        }} className="hover-scale" />

                        {/* Profile Popover */}
                        <div style={{
                            position: 'absolute', top: '110%', left: 0,
                            minWidth: '220px', padding: '1rem',
                            background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-subtle)',
                            borderRadius: '12px', backdropFilter: 'blur(12px)',
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                            opacity: showProfile ? 1 : 0, visibility: showProfile ? 'visible' : 'hidden',
                            transform: showProfile ? 'translateY(0)' : 'translateY(-10px)',
                            transition: 'all 0.2s ease', zIndex: 100
                        }}>
                            <p style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.2rem' }}>{user?.user_metadata?.full_name || user?.name || 'Usuario'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{user?.email}</p>
                            {/* Display Role from DB (top-level) or Metadata */}
                            {(user?.role || user?.user_metadata?.role) && (
                                <span className={`badge ${user?.role === 'admin' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                                    {user?.role === 'admin' ? 'Administrador' : (user?.user_metadata?.role || 'Usuario')}
                                </span>
                            )}

                            <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => { setShowProfile(false); navigate('/admin'); }}
                                        style={{
                                            width: '100%',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            background: 'none', border: 'none',
                                            color: 'var(--color-primary)',
                                            cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 0'
                                        }}
                                    >
                                        <Shield size={16} /> Administrar
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowProfile(false); navigate('/update-password'); }}
                                    style={{
                                        width: '100%',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'none', border: 'none',
                                        color: '#3b82f6',
                                        cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 0'
                                    }}
                                >
                                    <Lock size={16} /> Cambiar Clave
                                </button>
                                <button
                                    onClick={logout}
                                    style={{
                                        width: '100%',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'none', border: 'none',
                                        color: 'var(--color-danger)',
                                        cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 0'
                                    }}
                                >
                                    <LogOut size={16} /> Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-h2" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{title}</h2>
                        <span className="text-label" style={{ fontSize: '0.7rem' }}>{user?.name}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {notificationCount > 0 && (
                        <div className="btn-icon" style={{ position: 'relative', cursor: 'default' }}>
                            <Bell size={20} color="var(--color-danger)" />
                            <span style={{
                                position: 'absolute', top: 0, right: 0,
                                width: '10px', height: '10px',
                                background: 'var(--color-danger)',
                                borderRadius: '50%', border: '2px solid var(--bg-card)'
                            }} />
                        </div>
                    )}
                </div>
            </header>

            <main className="main-content">
                {children}
            </main>

            <footer style={{
                textAlign: 'center',
                padding: '1.5rem',
                opacity: 0.4,
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginTop: 'auto'
            }}>
                <p>Desarrollado por Ing. Amaro A. Vilela V. (v1.6 - Name Fix)</p>
                <p>E-mail: amalviva@gmail.com | Tel: 944499069</p>
            </footer>
        </div>
    );
};

export default DashboardLayout;
