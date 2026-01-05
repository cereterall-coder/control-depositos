import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Tag, Save, ArrowLeft, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

// DiceBear API (Latest v9.x)
const AVATAR_API = "https://api.dicebear.com/9.x/avataaars/svg?radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9&seed=";

const MALE_AVATARS = ['Christopher', 'Jacob', 'Mason', 'Ethan', 'Alexander', 'Ryan', 'David'];
const FEMALE_AVATARS = ['Sophia', 'Emma', 'Olivia', 'Isabella', 'Mia', 'Emily', 'Abigail'];

const ProfileSettings = () => {
    const { user, setUser } = useAuth(); // Need setUser to update context locally if needed
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        alias: '',
        phone: '',
        email: '',
        avatar_url: ''
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

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"

            setFormData({
                full_name: data?.full_name || '',
                alias: data?.alias || '',
                phone: data?.phone || '',
                email: user.email,
                avatar_url: data?.avatar_url || user.user_metadata?.avatar_url || ''
            });
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Error al cargar datos del perfil');
        }
    };

    const handleAvatarSelect = (seed) => {
        const url = `${AVATAR_API}${seed}`;
        setFormData(prev => ({ ...prev, avatar_url: url }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Update Public Profile
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: formData.full_name,
                    alias: formData.alias,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Update Auth Metadata
            const { data: { user: updatedUser }, error: authError } = await supabase.auth.updateUser({
                data: {
                    full_name: formData.full_name,
                    alias: formData.alias,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url
                }
            });

            if (authError) throw authError;

            // Manually update local user context if Supabase doesn't trigger it immediately
            // (AuthContext usually listens to onAuthStateChange, but manual update is safer for UI feedback)
            // But we can't easily access 'setUser' from here if it is not exported. 
            // We'll rely on the redirect and reload.

            toast.success('Perfil actualizado correctamente');

            setTimeout(() => {
                navigate('/');
                // Force a reload to ensure Context picks up new metadata if needed
                // window.location.reload(); // Optional, but navigation usually enough if Context subscribes well.
            }, 1000);

        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Error al actualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', background: 'var(--bg-app)' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-h2" style={{ margin: 0 }}>Mis Datos Personales</h2>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Avatar Selection Section */}
                    <div className="form-group" style={{ textAlign: 'center' }}>
                        <label className="text-label" style={{ marginBottom: '1rem', display: 'block' }}>Elige tu Avatar</label>

                        {/* Current User Avatar Preview */}
                        <div style={{ width: '100px', height: '100px', margin: '0 auto 1.5rem', borderRadius: '50%', border: '4px solid var(--color-primary)', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {formData.avatar_url ? (
                                <img src={formData.avatar_url} alt="Current Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#64748b' }}>{formData.email?.[0]?.toUpperCase()}</span>
                            )}
                        </div>

                        {/* Suggestions Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Males */}
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Hombres</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    {MALE_AVATARS.map(seed => (
                                        <div
                                            key={seed}
                                            onClick={() => handleAvatarSelect(seed)}
                                            style={{
                                                width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', overflow: 'hidden',
                                                border: formData.avatar_url.includes(seed) ? '3px solid var(--color-primary)' : '2px solid transparent',
                                                transition: 'transform 0.2s',
                                                background: '#f1f5f9'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <img src={`${AVATAR_API}${seed}`} alt={seed} style={{ width: '100%', height: '100%' }} referrerPolicy="no-referrer" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Females */}
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Mujeres</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    {FEMALE_AVATARS.map(seed => (
                                        <div
                                            key={seed}
                                            onClick={() => handleAvatarSelect(seed)}
                                            style={{
                                                width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', overflow: 'hidden',
                                                border: formData.avatar_url.includes(seed) ? '3px solid var(--color-primary)' : '2px solid transparent',
                                                transition: 'transform 0.2s',
                                                background: '#f1f5f9'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <img src={`${AVATAR_API}${seed}`} alt={seed} style={{ width: '100%', height: '100%' }} referrerPolicy="no-referrer" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1rem 0' }} />

                    {/* Basic Info Fields */}
                    <div className="form-group">
                        <label className="text-label">Correo Electrónico</label>
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
                    </div>

                    <div className="form-group">
                        <label className="text-label">Alias / Apodo</label>
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
