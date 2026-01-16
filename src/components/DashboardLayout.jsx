import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, Shield, Lock, User, Menu, X, Users, Activity } from 'lucide-react';

const DashboardLayout = ({ children, title, notificationCount = 0 }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showProfile, setShowProfile] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.user_metadata?.role === 'admin';

    return (
        <div className="app-container">
            {/* --- SIDEBAR MENU (Hamburger) --- */}
            <div style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
                background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(10px)',
                zIndex: 1000,
                transform: showMenu ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRight: '1px solid var(--border-subtle)',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 className="text-h2" style={{ margin: 0, fontSize: '1.2rem' }}>Menú</h2>
                    <button onClick={() => setShowMenu(false)} className="btn-icon">
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                    {/* ADMIN OPTIONS */}
                    {isAdmin && (
                        <>
                            <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Administración
                            </div>
                            <button onClick={() => { navigate('/admin/users'); setShowMenu(false); }} className="settings-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '1rem', borderRadius: '8px' }}>
                                <Users size={20} color="#60a5fa" />
                                <span>Control de Usuarios</span>
                            </button>
                            <button onClick={() => { navigate('/admin/dashboard'); setShowMenu(false); }} className="settings-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '1rem', borderRadius: '8px' }}>
                                <Activity size={20} color="#f59e0b" />
                                <span>Métricas</span>
                            </button>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }}></div>
                        </>
                    )}

                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Cuenta
                    </div>
                    <button onClick={() => { navigate('/profile'); setShowMenu(false); }} className="settings-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '1rem', borderRadius: '8px' }}>
                        <User size={20} />
                        <span>Mi Perfil / Contraseña</span>
                    </button>
                    {isAdmin && (
                        <button onClick={() => { navigate('/admin/users'); setShowMenu(false); }} className="settings-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '1rem', borderRadius: '8px' }}>
                            <Lock size={20} />
                            <span>Reiniciar Clave Usuario</span>
                        </button>
                    )}
                </div>

                <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                        <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* OVERLAY for Menu */}
            {showMenu && (
                <div
                    onClick={() => setShowMenu(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(2px)' }}
                />
            )}

            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* HAMBURGER BUTTON */}
                    <button onClick={() => setShowMenu(true)} className="btn-icon" style={{ marginRight: '0.5rem' }}>
                        <Menu size={24} />
                    </button>

                    <div
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => navigate('/profile')} // Click goes to profile directly now
                    >
                        <div style={{
                            width: '40px', height: '40px',
                            clipPath: 'circle(50% at 50% 50%)', // Circle for cleaner look with menu
                            background: 'url(/pwa-192x192.png) center/cover no-repeat, linear-gradient(135deg, var(--color-primary), #0f172a)',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }} />
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
                <p>Desarrollado por <span className="font-signature" style={{ fontSize: '1.4em' }}>Amalviva</span></p>
                <p>E-mail: amalviva@gmail.com | Tel: 944499069</p>
            </footer>
        </div>
    );
};

export default DashboardLayout;
