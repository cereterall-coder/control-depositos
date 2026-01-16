import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/depositService';
import { Trash2, UserCog, Shield, Users, Save, X, Lock, Activity, Ban, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);

    // Edit States
    const [editRole, setEditRole] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editSubscriptionStatus, setEditSubscriptionStatus] = useState('');
    const [editTrialEnd, setEditTrialEnd] = useState('');

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user && user.role !== 'admin') {
            toast.error("Acceso denegado. Requiere permisos de Administrador.");
            navigate('/');
            return;
        }
        loadProfiles();
    }, [user]);

    const loadProfiles = async () => {
        try {
            const data = await depositService.getAllProfiles();
            setProfiles(data || []);
        } catch (e) {
            toast.error("Error al cargar usuarios: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (id) => {
        try {
            // In a real app we would call a specific updateSubscription method, but updateProfileStatus works if generic or we add a new one.
            // We need to implement updateProfileSubscription in depositService or update updateProfileStatus to take more args.
            // For now, let's assume we update everything via independent calls or one big update.
            // Let's create a new method in depositService.js first.
            await depositService.updateProfileSubscription(id, {
                role: editRole,
                status: editStatus,
                subscription_status: editSubscriptionStatus,
                trial_end_date: editTrialEnd || null
            });

            toast.success("Perfil actualizado correctamente");
            setEditingId(null);
            loadProfiles();
        } catch (e) {
            toast.error("Error al actualizar: " + e.message);
        }
    };

    const handleResetPassword = async (email) => {
        if (!confirm(`¿Enviar correo de restablecimiento de contraseña a ${email}?`)) return;
        try {
            await depositService.triggerPasswordReset(email);
            toast.success(`Correo enviado a ${email}`);
        } catch (e) {
            toast.error("Error al enviar correo: " + e.message);
        }
    };

    const handleDelete = async (id, email) => {
        if (!confirm(`¿Estás seguro de eliminar el perfil de ${email}? Esto no elimina la cuenta de acceso, solo el perfil de datos.`)) return;
        try {
            await depositService.deleteProfile(id);
            toast.success("Perfil eliminado");
            loadProfiles();
        } catch (e) {
            toast.error("Error al eliminar: " + e.message);
        }
    };

    // Helper: Calculate Remaining Days
    const getDaysRemaining = (endDate) => {
        if (!endDate) return 0;
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Filter Logic
    const filteredProfiles = profiles.filter(profile => {
        const term = searchTerm.toLowerCase();
        const email = (profile.email || '').toLowerCase();
        const name = (profile.full_name || '').toLowerCase();
        return email.includes(term) || name.includes(term);
    });

    return (
        <DashboardLayout title="Administración de Usuarios">
            <div className="glass-panel card-padding">
                <button
                    onClick={() => navigate('/sender')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', fontSize: '1rem' }}
                >
                    &larr; Regresar al Dashboard
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Shield size={24} color="var(--color-primary)" />
                        <h2 className="text-h2" style={{ margin: 0 }}>Gestión de Suscripciones</h2>
                    </div>

                    {/* Search Input */}
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '2.5rem', width: '100%' }}
                        />
                    </div>
                </div>

                {loading ? (
                    <p>Cargando usuarios...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>Usuario</th>
                                    <th style={{ padding: '1rem' }}>Suscripción</th>
                                    <th style={{ padding: '1rem' }}>Estado</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProfiles.map(profile => {
                                    const subStatus = profile.subscription_status || 'trial';
                                    const daysLeft = getDaysRemaining(profile.trial_end_date);
                                    let statusColor = 'orange'; // Default Trial
                                    if (subStatus === 'active') statusColor = 'var(--color-success)'; // Premium
                                    if (subStatus === 'expired') statusColor = 'var(--color-danger)'; // Expired

                                    return (
                                        <tr key={profile.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ padding: '0.4rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}>
                                                        <Users size={16} />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 500 }}>{profile.full_name || 'Sin nombre'}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile.email}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* SUBSCRIPTION COLUMN */}
                                            <td style={{ padding: '1rem' }}>
                                                {editingId === profile.id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <select
                                                            value={editSubscriptionStatus}
                                                            onChange={e => setEditSubscriptionStatus(e.target.value)}
                                                            className="input-field"
                                                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                                                        >
                                                            <option value="trial">Prueba (Trial)</option>
                                                            <option value="active">Premium (Activo)</option>
                                                            <option value="expired">Vencido</option>
                                                            <option value="suspended">Suspendido</option>
                                                        </select>
                                                        {editSubscriptionStatus === 'trial' && (
                                                            <input type="date" value={editTrialEnd ? editTrialEnd.split('T')[0] : ''} onChange={e => setEditTrialEnd(e.target.value)} className="input-field" style={{ padding: '0.25rem', fontSize: '0.8rem' }} />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }}></div>
                                                            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', color: statusColor }}>
                                                                {subStatus === 'trial' ? 'En Prueba' :
                                                                    subStatus === 'active' ? 'Premium' :
                                                                        subStatus === 'expired' ? 'Vencido' : subStatus}
                                                            </span>
                                                        </div>
                                                        {subStatus === 'trial' && (
                                                            <span style={{ fontSize: '0.75rem', color: daysLeft <= 3 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                                                                {daysLeft > 0 ? `Quedan ${daysLeft} días` : 'Expiró hoy'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* ROLE & STATUS (Combined for compactness) */}
                                            <td style={{ padding: '1rem' }}>
                                                {editingId === profile.id ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <select value={editRole} onChange={e => setEditRole(e.target.value)} className="input-field" style={{ padding: '0.25rem', fontSize: '0.8rem' }}>
                                                            <option value="sender">Usuario</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <span className={`badge ${profile.role === 'admin' ? 'badge-success' : 'badge-secondary'}`}>
                                                        {profile.role === 'admin' ? 'BOSS' : 'User'}
                                                    </span>
                                                )}
                                            </td>

                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                {editingId === profile.id ? (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button onClick={() => handleSave(profile.id)} className="btn-icon" style={{ color: 'var(--color-success)' }} title="Guardar">
                                                            <Save size={18} />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="btn-icon" style={{ color: 'var(--text-muted)' }} title="Cancelar">
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(profile.id);
                                                                setEditRole(profile.role || 'sender');
                                                                setEditStatus(profile.status || 'active');
                                                                setEditSubscriptionStatus(profile.subscription_status || 'trial');
                                                                setEditTrialEnd(profile.trial_end_date);
                                                            }}
                                                            className="btn-icon"
                                                            title="Gestionar Suscripción"
                                                            style={{ color: 'var(--color-primary)' }}
                                                        >
                                                            <UserCog size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(profile.id, profile.email)}
                                                            className="btn-icon"
                                                            title="Eliminar Perfil"
                                                            style={{ color: 'var(--color-danger)' }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetPassword(profile.email)}
                                                            className="btn-icon"
                                                            title="Enviar Correo Reset Clave"
                                                            style={{ color: 'var(--color-warning, #f59e0b)' }}
                                                        >
                                                            <Lock size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredProfiles.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                {profiles.length === 0 ? 'No hay usuarios registrados.' : 'No se encontraron resultados.'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminUsers;
