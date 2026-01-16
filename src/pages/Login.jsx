import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
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
    const [alias, setAlias] = useState('');
    const [phone, setPhone] = useState('');

    const [isRecovering, setIsRecovering] = useState(false);

    const handleRecovery = async (e) => {
        e.preventDefault();
        if (!email) return toast.error("Ingresa tu correo para recuperar la clave");
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password',
            });
            if (error) throw error;
            toast.success("Te hemos enviado un correo para restablecer tu contraseña");
            setIsRecovering(false);
        } catch (err) {
            toast.error("Error al enviar correo: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isRegistering) {
                if (!fullName) throw new Error("Por favor ingresa tu nombre completo");
                if (!alias) throw new Error("Por favor ingresa un alias");
                if (!phone) throw new Error("Por favor ingresa tu teléfono");

                await signUp(email, password, fullName, alias, phone);
                toast.success('¡Registro exitoso! Confirma tu e-mail.', { duration: 5000 });
                setIsRegistering(false);
            } else {
                await signIn(email, password);
                toast.success('Bienvenido de vuelta');
                navigate('/');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top, var(--bg-surface), var(--bg-app))', overflowY: 'auto' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', paddingBottom: '3rem' }}>
                <div className="glass-panel" style={{ padding: '2rem 1.5rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '50%', boxShadow: 'var(--shadow-glow)' }}>
                            <ShieldCheck size={40} color="var(--color-primary)" />
                        </div>
                    </div>

                    <h1 className="text-h2" style={{ marginBottom: '0.25rem' }}>
                        {isRegistering ? 'Crear Cuenta' : 'Acceso Seguro'}
                    </h1>
                    <p className="text-label" style={{ marginBottom: '1.5rem', textTransform: 'none' }}>Control de Depósitos v2.0</p>

                    {isRecovering ? (
                        <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Ingresa tu correo y te enviaremos un enlace mágico para restablecer tu contraseña.
                            </p>
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
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ marginTop: '0.5rem', width: '100%' }}
                            >
                                {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsRecovering(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '0.5rem' }}
                            >
                                Cancelar
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {isRegistering && (
                                <>
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

                                    <div style={{ position: 'relative' }} className="animate-fade-in">
                                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                                        <input
                                            type="text"
                                            placeholder="Alias (Corto)"
                                            required={isRegistering}
                                            className="input-field"
                                            style={{ paddingLeft: '2.8rem' }}
                                            value={alias}
                                            onChange={e => setAlias(e.target.value)}
                                        />
                                    </div>

                                    <div style={{ position: 'relative' }} className="animate-fade-in">
                                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                                        <input
                                            type="tel"
                                            placeholder="Teléfono"
                                            required={isRegistering}
                                            className="input-field"
                                            style={{ paddingLeft: '2.8rem' }}
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                        />
                                    </div>
                                </>
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
                                style={{ marginTop: '0.5rem', width: '100%' }}
                            >
                                {loading ? 'Procesando...' : isRegistering ? 'REGISTRARSE' : 'INGRESAR'}
                                {!loading && <ArrowRight size={18} />}
                            </button>

                            {!isRegistering && (
                                <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsRecovering(true)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                        <button
                            type="button" // Important preventing form submit
                            onClick={() => setIsRegistering(!isRegistering)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', width: '100%', padding: '0.5rem' }}
                        >
                            {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿Nuevo usuario? Regístrate aquí'}
                        </button>
                    </div>
                </div>
            </div>

            <footer style={{
                textAlign: 'center',
                padding: '1.5rem',
                opacity: 0.5,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '1rem' // Safe space
            }}>
                <p>Desarrollado por Ing. Amaro A. Vilela V.</p>
                <p>E-mail: amalviva@gmail.com | Tel: 944499069</p>
            </footer>
        </div>
    );
};

export default Login;
