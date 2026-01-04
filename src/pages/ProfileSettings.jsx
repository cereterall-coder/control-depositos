import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Tag, Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfileSettings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        alias: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    alias: data.alias || '',
                    phone: data.phone || '',
                    email: user.email // Email from Auth, immutable
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Error al cargar datos del perfil');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Update Public Profile (Upsert to handle missing rows)
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: formData.full_name,
                    alias: formData.alias,
                    phone: formData.phone,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Also try to update Auth Metadata (Best effort)
            await supabase.auth.updateUser({
                data: {
                    full_name: formData.full_name,
                    alias: formData.alias,
                    phone: formData.phone
                }
            });

            toast.success('Perfil actualizado correctamente');

            // Redirect back to dashboard after short delay
            setTimeout(() => {
                navigate('/');
            }, 1000);

        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Error al actualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-h2" style={{ margin: 0 }}>Mis Datos</h2>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Read Only Email */}
                    <div className="form-group">
                        <label className="text-label">Correo Electrónico (No editable)</label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="input-field"
                            style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="text-label">Nombre Completo</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input-field"
                                style={{ paddingLeft: '2.8rem' }}
                                placeholder="Ej. Juan Perez"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Este nombre aparecerá en los depósitos que envíes.</p>
                    </div>

                    <div className="form-group">
                        <label className="text-label">Alias / Apodo (Opcional)</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Tag size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input-field"
                                style={{ paddingLeft: '2.8rem' }}
                                placeholder="Ej. Juancito"
                                value={formData.alias}
                                onChange={e => setFormData({ ...formData, alias: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="text-label">Celular / Teléfono</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                            <input
                                type="tel"
                                className="input-field"
                                style={{ paddingLeft: '2.8rem' }}
                                placeholder="Ej. 999888777"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={loading}
                        >
                            {loading ? <div className="spinner-small" /> : <Save size={18} />}
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
