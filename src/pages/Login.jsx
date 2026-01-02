import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
    const { signIn, signUp } = useAuth(); // Added signUp for registration
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            if (isRegistering) {
                await signUp(email, password);
                alert('Registro exitoso. Por favor revisa tu correo para confirmar.');
                setIsRegistering(false);
            } else {
                await signIn(email, password);
                // Navigation is handled by the App wrapper reacting to user state, 
                // but we can force redirect if needed based on email or metadata
                // For now, let the ProtectedRoute redirect simple logic
            }
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at top, var(--bg-surface), var(--bg-app))' }}>
            <div className="glass-panel" style={{ padding: '3rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '50%', boxShadow: 'var(--shadow-glow)' }}>
                        <ShieldCheck size={48} color="var(--color-primary)" />
                    </div>
                </div>

                <h1 className="text-h2" style={{ marginBottom: '0.5rem' }}>
                    {isRegistering ? 'Crear Cuenta' : 'Acceso Seguro'}
                </h1>
                <p className="text-label" style={{ marginBottom: '2rem', textTransform: 'none' }}>Control de Depósitos y Vouchers</p>

                {errorMsg && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                        <input
                            type="email"
                            placeholder="Correo Electrónico"
                            required
                            className="input-field"
                            style={{ paddingLeft: '2.8rem' }}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            required
                            className="input-field"
                            style={{ paddingLeft: '2.8rem' }}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem', width: '100%' }}
                    >
                        {loading ? 'Procesando...' : isRegistering ? 'Registrarse' : 'Ingresar'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Regístrate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
