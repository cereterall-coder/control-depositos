import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/depositService';
import { Trash2, UserCog, Shield, Users, Save, X, Lock, Activity, Ban, CheckCircle } from 'lucide-react';
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
            await depositService.updateProfileRole(id, editRole);
            await depositService.updateProfileStatus(id, editStatus);
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

    return (
        <DashboardLayout title="Administración de Usuarios">
            <div className="glass-panel card-padding">
                <button
                    onClick={() => navigate('/sender')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', fontSize: '1rem' }}
                >
                    &larr; Regresar al Dashboard
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <Shield size={24} color="var(--color-primary)" />
                    <h2 className="text-h2" style={{ margin: 0 }}>Gestión de Perfiles</h2>
                </div>

                {loading ? (
                    <p>Cargando usuarios...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>Usuario</th>
                                    <th style={{ padding: '1rem' }}>Email</th>
                                    <th style={{ padding: '1rem' }}>Rol</th>
                                    <th style={{ padding: '1rem' }}>Estado</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profiles.map(profile => (
                                    <tr key={profile.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ padding: '0.4rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}>
                                                    <Users size={16} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 500 }}>{profile.full_name || 'Sin nombre'}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reg: {new Date(profile.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{profile.email}</td>

                                        {/* ROLE COLUMN */}
                                        <td style={{ padding: '1rem' }}>
                                            {editingId === profile.id ? (
                                                <select
                                                    value={editRole}
                                                    onChange={e => setEditRole(e.target.value)}
                                                    className="input-field"
                                                    style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                                                >
                                                    <option value="sender">Usuario</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className={`badge ${profile.role === 'admin' ? 'badge-success' : 'badge-warning'}`}>
                                                    {profile.role === 'admin' ? 'Admin' : 'Usuario'}
                                                </span>
                                            )}
                                        </td>

                                        {/* STATUS COLUMN */}
                                        <td style={{ padding: '1rem' }}>
                                            {editingId === profile.id ? (
                                                <select
                                                    value={editStatus}
                                                    onChange={e => setEditStatus(e.target.value)}
                                                    className="input-field"
                                                    style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                                                >
                                                    <option value="active">Activo</option>
                                                    <option value="pending">Pendiente</option>
                                                    <option value="blocked">Bloqueado</option>
                                                </select>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    {(profile.status === 'active' || !profile.status) && <CheckCircle size={14} color="var(--color-success)" />}
                                                    {profile.status === 'pending' && <Activity size={14} color="orange" />}
                                                    {profile.status === 'blocked' && <Ban size={14} color="red" />}
                                                    <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>
                                                        {profile.status === 'active' || !profile.status ? 'Activo' :
                                                            profile.status === 'pending' ? 'Pendiente' : 'Bloqueado'}
                                                    </span>
                                                </div>
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
                                                        onClick={() => handleResetPassword(profile.email)}
                                                        className="btn-icon"
                                                        title="Enviar Correo Reset Password"
                                                        style={{ color: '#3b82f6' }}
                                                    >
                                                        <Lock size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(profile.id);
                                                            setEditRole(profile.role || 'sender');
                                                            setEditStatus(profile.status || 'active');
                                                        }}
                                                        className="btn-icon"
                                                        title="Editar Usuario"
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
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {profiles.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No hay usuarios registrados.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminUsers;
