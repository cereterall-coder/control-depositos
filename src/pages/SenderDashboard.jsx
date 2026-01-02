import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { depositService } from '../services/depositService';
import { useAuth } from '../context/AuthContext';
import { Upload, DollarSign, Calendar, Eye, Activity, UserPlus, Star, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const SenderDashboard = () => {
    const { user } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [contacts, setContacts] = useState([]); // Favorites list
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [amount, setAmount] = useState('');
    // Automatically set today's date
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [file, setFile] = useState(null);

    // UI Helper for autocomplete
    const [showSuggestions, setShowSuggestions] = useState(false);

    const refreshData = async () => {
        if (!user) return;
        try {
            const [history, savedContacts] = await Promise.all([
                depositService.getDeposits(user.email, user.id),
                depositService.getContacts(user.id)
            ]);
            setDeposits(history);
            setContacts(savedContacts || []);
        } catch (e) {
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este depósito?')) return;
        try {
            await depositService.deleteDeposit(id);
            toast.success("Eliminado");
            refreshData();
        } catch (e) {
            toast.error("No se pudo eliminar. ¿Quizás ya pasó el tiempo permitido?");
        }
    };

    useEffect(() => {
        refreshData();
        const subHistory = supabase.channel('deposits_sub').on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, refreshData).subscribe();
        return () => { supabase.removeChannel(subHistory); }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const toastId = toast.loading('Enviando...');

        try {
            await depositService.addDeposit({
                amount: parseFloat(amount),
                date: date || new Date().toISOString(),
                voucherFile: file,
                recipientEmail,
                senderId: user.id
            });

            toast.success('Enviado correctamente', { id: toastId });
            setAmount('');
            // Keep today's date
            setDate(new Date().toISOString().split('T')[0]);
            setFile(null);

            // Check if is favorite
            const isFav = contacts.some(c => c.contact_email === recipientEmail);
            if (!isFav) {
                askToSaveFavorite(recipientEmail);
            }
            setRecipientEmail('');

        } catch (err) {
            toast.error('Error: ' + err.message, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const askToSaveFavorite = (email) => {
        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span>¿Guardar en favoritos?</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            // Simple prompt for now
                            const name = prompt("Nombre para este contacto (ej. Juan):", email.split('@')[0]);
                            if (name) saveFavorite(email, name);
                        }}
                        style={{ background: 'var(--color-primary)', border: 'none', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Sí, guardar
                    </button>
                    <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                        No
                    </button>
                </div>
            </div>
        ), { duration: 8000, icon: '⭐' });
    };

    const saveFavorite = async (email, name) => {
        try {
            await depositService.addContact(user.id, email, name);
            toast.success(`¡${name} guardado/a!`);
            refreshData(); // Reload contacts
        } catch (e) {
            toast.error("No se pudo guardar");
        }
    };

    const handleViewVoucher = async (path) => {
        const toastId = toast.loading('Cargando imagen...');
        const url = await depositService.getVoucherUrl(path);
        toast.dismiss(toastId);
        if (url) window.open(url, '_blank');
        else toast.error("No se pudo cargar la imagen", { id: toastId });
    };

    return (
        <DashboardLayout title="Control de Depósitos">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>

                <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
                    <h3 className="text-h2" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity color="var(--color-primary)" /> Nuevo Envío
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label className="text-label">Email o Nombre Destinatario</label>
                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                <UserPlus size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Escribe nombre o correo..."
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={recipientEmail}
                                    onChange={e => {
                                        setRecipientEmail(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    autoComplete="off"
                                />

                                {/* Suggestions Dropdown */}
                                {showSuggestions && contacts.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                                        borderRadius: '0 0 8px 8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}>
                                        {contacts
                                            .filter(c =>
                                                c.contact_email.toLowerCase().includes(recipientEmail.toLowerCase()) ||
                                                c.contact_name?.toLowerCase().includes(recipientEmail.toLowerCase())
                                            )
                                            .map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setRecipientEmail(c.contact_email); // Fill with email for submission
                                                        setShowSuggestions(false);
                                                    }}
                                                    style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                >
                                                    <Star size={12} fill="gold" color="gold" />
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 500 }}>{c.contact_name || 'Sin nombre'}</span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.contact_email}</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="text-label">Monto (S/.)</label>
                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                <DollarSign size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="text-label">Fecha</label>
                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                                <input
                                    type="date"
                                    required
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="text-label">Voucher (Foto)</label>
                            <div
                                style={{
                                    border: '2px dashed var(--border-subtle)',
                                    padding: '1.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    textAlign: 'center',
                                    marginTop: '0.5rem',
                                    cursor: 'pointer',
                                    background: file ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                                }}
                                onClick={() => document.getElementById('fileUpload').click()}
                            >
                                <Upload size={24} style={{ marginBottom: '0.5rem', color: file ? 'var(--color-success)' : 'var(--text-muted)' }} />
                                <p style={{ fontSize: '0.8rem' }}>{file ? file.name : 'Subir imagen'}</p>
                                <input
                                    id="fileUpload"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => setFile(e.target.files[0])}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                            {submitting ? 'Subiendo...' : 'Registrar Depósito'}
                        </button>
                    </form>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="text-h2" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Historial</h3>
                        <span className="badge badge-warning" style={{ color: 'var(--text-secondary)' }}>
                            {deposits.length} Registros
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {loading ? <p>Cargando datos...</p> : deposits.map(dep => {
                                const contactName = contacts.find(c => c.contact_email === dep.recipient_email)?.contact_name || dep.recipient_email;
                                const isToday = new Date(dep.created_at).toDateString() === new Date().toDateString();

                                return (
                                    <div key={dep.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>S/. {dep.amount}</p>
                                                <div>
                                                    <span className="text-label" style={{ fontSize: '0.8rem', display: 'block', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                        {dep.sender_id === user.id ? `Para: ${contactName}` : `De: ${dep.sender_id.slice(0, 5)}...`}
                                                    </span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {new Date(dep.deposit_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* View Voucher Button */}
                                            {dep.voucher_url && (
                                                <button
                                                    onClick={() => handleViewVoucher(dep.voucher_url)}
                                                    style={{
                                                        background: 'none', border: 'none',
                                                        color: 'var(--color-primary)', fontSize: '0.8rem',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                        gap: '0.25rem', marginTop: '0.5rem', padding: 0
                                                    }}
                                                >
                                                    <Eye size={12} /> Ver Voucher
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                                                <span className={`badge ${dep.status === 'read' ? 'badge-success' : 'badge-warning'}`}>
                                                    {dep.status === 'read' ? 'Leído' : 'Enviado'}
                                                </span>
                                                {/* Delete Button (Only if created today) */}
                                                {isToday && (
                                                    <button
                                                        onClick={() => handleDelete(dep.id)}
                                                        className="btn-icon"
                                                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', cursor: 'pointer', border: 'none', padding: '0.25rem' }}
                                                        title="Eliminar (Solo hoy)"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default SenderDashboard;
