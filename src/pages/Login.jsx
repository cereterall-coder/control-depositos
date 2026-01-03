import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isRegistering) {
                if (!fullName) throw new Error("Por favor ingresa tu nombre completo");
                await signUp(email, password, fullName);
                toast.success('¡Registro exitoso! Confirma tu e-mail.', { duration: 5000 });
                setIsRegistering(false);
            } else {
                await signIn(email, password);
                toast.success('Bienvenido de vuelta');
            }
        } catch (err) {
            toast.error(err.message);
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
                <p className="text-label" style={{ marginBottom: '2rem', textTransform: 'none' }}>Control de Depósitos v2.0</p>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {isRegistering && (
                        <div style={{ position: 'relative' }} className="animate-fade-in">
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Nombre Completo"
                                required={isRegistering}
                                className="input-field"
                                style={{ paddingLeft: '2.8rem' }}
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                            />
                        </div>
                    )}

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
                        {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿Nuevo usuario? Regístrate'}
                    </button>
                </div>
            </div>

            <footer style={{
                textAlign: 'center',
                padding: '1rem',
                opacity: 0.6,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                position: 'fixed',
                bottom: 0,
                width: '100%',
                background: 'linear-gradient(to top, var(--bg-app) 20%, transparent)'
            }}>
                <p>Desarrollado por Ing. Amaro A. Vilela V.</p>
                <p>E-mail: amalviva@gmail.com | Tel: 944499069</p>
            </footer>
        </div>
    );
};

export default Login;
