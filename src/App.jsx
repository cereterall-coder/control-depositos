import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import SenderDashboard from './pages/SenderDashboard';
import RecipientDashboardV2 from './pages/RecipientDashboardV2';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import UpdatePassword from './pages/UpdatePassword';

// ... imports ...

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/test" element={<ConnectionTest />} />
            <Route path="/simple" element={<SimpleLogin />} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/" element={
                <ProtectedRoute>
                    <SenderDashboard />
                </ProtectedRoute>
            } />
            <Route path="/sender" element={<ProtectedRoute><SenderDashboard /></ProtectedRoute>} />
            <Route path="/billetera-v3" element={<ProtectedRoute><RecipientDashboardV2 /></ProtectedRoute>} />
            <Route path="/recipient" element={<Navigate to="/billetera-v3" />} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}

function ConfigError() {
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: 'white', padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>⚠️ Error de Configuración</h1>
            <p>La aplicación no detecta las llaves de Supabase.</p>
            <p style={{ marginTop: '1rem', background: '#333', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace' }}>
                Verifica que el archivo <strong>.env.local</strong> exista en la raíz del proyecto<br />
                y contenga VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
            </p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', cursor: 'pointer', background: '#3b82f6', border: 'none', borderRadius: '4px', color: 'white' }}>
                Recargar Página
            </button>
        </div>
    );
}

function App() {
    if (supabase.isMock) {
        return <ConfigError />;
    }

    return (
        <AuthProvider>
            <AppRoutes />
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                }}
            />
        </AuthProvider>
    );
}

export default App;
