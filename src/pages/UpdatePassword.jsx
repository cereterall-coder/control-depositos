import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff } from 'lucide-react';

const UpdatePassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Verify session on mount
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, perhaps the link expired or flow is wrong
                toast.error("El enlace ha expirado o no es válido.");
                navigate('/login');
            }
        });
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading("Actualizando contraseña...");

        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;

            toast.success("¡Contraseña actualizada! Redirigiendo...", { id: toastId });

            // Wait a bit then go to dashboard
            setTimeout(() => {
                navigate('/');
            }, 1000);

        } catch (error) {
            toast.error("Error: " + error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="logo-placeholder" style={{ margin: '0 auto 1rem', background: 'rgba(59, 130, 246, 0.1)' }}>
                        <Lock size={32} className="logo-icon" color="#3b82f6" />
                    </div>
                    <h1 className="text-h1">Nueva Contraseña</h1>
                    <p className="text-body" style={{ color: 'var(--text-muted)' }}>
                        Ingresa tu nueva clave segura
                    </p>
                </div>

                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label className="text-label">Nueva Contraseña</label>
                        <div className="password-input-wrapper">
                            <Lock className="field-icon" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field with-icon"
                                placeholder="******"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem', height: '48px' }}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
