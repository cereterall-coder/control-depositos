import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
                // toast.success('¡Registro exitoso! Confirma tu e-mail.', { duration: 5000 });
                setRegistrationSuccess(true);
                // setIsRegistering(false); // Managed by UI state now
            } else {
                const data = await signIn(email, password);
                toast.success('Bienvenido de vuelta');

                // Directly fetch profile to verify role, ignoring potentially stale user_metadata
                let targetRoute = '/';
                try {
                    if (data.user) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', data.user.id)
                            .single();

                        if (profile && profile.role === 'admin') {
                            targetRoute = '/admin/users';
                        }
                    }
                } catch (err) {
                    console.error("Error checking admin role on login:", err);
                }

                // If going to standard dashboard, force "New Deposit" tab by clearing persistence
                if (targetRoute === '/') {
                    localStorage.removeItem('last_active_tab');
                }

                navigate(targetRoute);
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
                    {registrationSuccess ? (
                        <div className="animate-fade-in">
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                                boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
                            }}>
                                <Mail size={40} />
                            </div>
                            <h2 className="text-h2" style={{ marginBottom: '1rem' }}>
                                ¡Registro Exitoso!
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                Hemos enviado un enlace de verificación a <strong>{email}</strong>.
                                <br /><br />
                                Por favor, abre el mensaje y haz clic en el botón para <strong>confirmar tu cuenta</strong> y continuar.
                            </p>
                            <button
                                onClick={() => {
                                    setRegistrationSuccess(false);
                                    setIsRegistering(false);
                                    window.location.reload(); // Reload to clear states clean or just reset
                                }}
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                            >
                                Entendido, ir a Iniciar Sesión
                            </button>
                        </div>
                    ) : (
                        <>
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
                                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 10 }} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Contraseña"
                                            required
                                            className="input-field"
                                            style={{ paddingLeft: '2.8rem', paddingRight: '3rem', borderRadius: '8px' }}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '5px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'rgba(15, 23, 42, 0.5)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px',
                                                color: '#60a5fa',
                                                cursor: 'pointer',
                                                zIndex: 50,
                                                width: '36px',
                                                height: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 0
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
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
                        </>
                    )}
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
                <p>Desarrollado por <span className="font-signature" style={{ fontSize: '1.8em' }}>Amalviva</span></p>
                <p>E-mail: amalviva@gmail.com | Tel: 944499069</p>
            </footer>
        </div>
    );
};

export default Login;
