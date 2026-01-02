import { useAuth } from '../context/AuthContext';
import { LogOut, Bell } from 'lucide-react';

const DashboardLayout = ({ children, title, notificationCount = 0 }) => {
    const { user, logout } = useAuth();

    return (
        <div className="app-container">
            <header style={{
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-subtle)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-danger))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {user?.name?.[0]}
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
                <p>Email: amalviva@gmail.com | Tel: 944499069</p>
            </footer>
        </div>
    );
};

export default DashboardLayout;
