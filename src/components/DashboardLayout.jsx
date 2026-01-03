import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell } from 'lucide-react';

const DashboardLayout = ({ children, title, notificationCount = 0 }) => {
    const { user, logout } = useAuth();
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
                            {user?.user_metadata?.role && (
                                <span className="badge badge-success" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                                    {user.user_metadata.role}
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-h2" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{title}</h2>
                        <span className="text-label" style={{ fontSize: '0.7rem' }}>{user?.name}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                    <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
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
                <p>Desarrollado por Ing. Amaro A. Vilela V.</p>
                <p>E-mail: amalviva@gmail.com | Tel: 944499069</p>
            </footer>
        </div>
    );
};

export default DashboardLayout;
