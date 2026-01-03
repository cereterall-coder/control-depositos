import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/depositService';
import { Trash2, UserCog, Shield, Users, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editRole, setEditRole] = useState('');

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

    const handleSaveRole = async (id) => {
        try {
            await depositService.updateProfileRole(id, editRole);
            toast.success("Rol actualizado correctamente");
            setEditingId(null);
            loadProfiles();
        } catch (e) {
            toast.error("Error al actualizar: " + e.message);
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
                                    <th style={{ padding: '1rem' }}>Registro</th>
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
                                                <span style={{ fontWeight: 500 }}>{profile.full_name || 'Sin nombre'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{profile.email}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {editingId === profile.id ? (
                                                <select
                                                    value={editRole}
                                                    onChange={e => setEditRole(e.target.value)}
                                                    className="input-field"
                                                    style={{ padding: '0.25rem' }}
                                                >
                                                    <option value="sender">Usuario (Sender)</option>
                                                    <option value="admin">Administrador</option>
                                                </select>
                                            ) : (
                                                <span className={`badge ${profile.role === 'admin' ? 'badge-success' : 'badge-warning'}`}>
                                                    {profile.role === 'admin' ? 'Admin' : 'Usuario'}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(profile.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            {editingId === profile.id ? (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={() => handleSaveRole(profile.id)} className="btn-icon" style={{ color: 'var(--color-success)' }}>
                                                        <Save size={18} />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="btn-icon" style={{ color: 'var(--text-muted)' }}>
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(profile.id);
                                                            setEditRole(profile.role || 'sender');
                                                        }}
                                                        className="btn-icon"
                                                        title="Editar Rol"
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
