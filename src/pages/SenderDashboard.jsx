import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { depositService } from '../services/depositService';
import { useAuth } from '../context/AuthContext';
import { Upload, DollarSign, Calendar, Eye, Activity, UserPlus, Star, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const SenderDashboard = () => {
    const { user } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [contacts, setContacts] = useState([]); // Favorites list
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
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
            setDate('');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span>¿Guardar <b>{email}</b> en favoritos?</span>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        saveFavorite(email);
                    }}
                    style={{ background: 'var(--color-primary)', border: 'none', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Guardar
                </button>
                <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                    No
                </button>
            </div>
        ), { duration: 8000, icon: '⭐' });
    };

    const saveFavorite = async (email) => {
        try {
            await depositService.addContact(user.id, email);
            toast.success("¡Guardado en Favoritos!");
            refreshData(); // Reload contacts
        } catch (e) {
            toast.error("No se pudo guardar");
        }
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
                            <label className="text-label">Email Destinatario</label>
                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                <UserPlus size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    required
                                    placeholder="Buscar o escribir..."
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={recipientEmail}
                                    onChange={e => {
                                        setRecipientEmail(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                                    autoComplete="off"
                                />

                                {/* Suggestions Dropdown */}
                                {showSuggestions && contacts.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                                        borderRadius: '0 0 8px 8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto'
                                    }}>
                                        {contacts
                                            .filter(c => c.contact_email.toLowerCase().includes(recipientEmail.toLowerCase()))
                                            .map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setRecipientEmail(c.contact_email);
                                                        setShowSuggestions(false);
                                                    }}
                                                    style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                >
                                                    <Star size={12} fill="gold" color="gold" />
                                                    <span>{c.contact_email}</span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="text-label">Monto (USD)</label>
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
                        {loading ? <p>Cargando datos...</p> : deposits.map(dep => (
                            <div key={dep.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>${dep.amount}</p>
                                        <div>
                                            <span className="text-label" style={{ fontSize: '0.7rem', display: 'block' }}>
                                                {dep.sender_id === user.id ? `Para: ${dep.recipient_email}` : `De: ${dep.sender_id.slice(0, 5)}...`}
                                            </span>
                                            {/* Star indicator if favorite */}
                                            {contacts.some(c => c.contact_email === dep.recipient_email) && (
                                                <span style={{ fontSize: '0.6rem', color: 'gold' }}>★ Favorito</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-label" style={{ fontSize: '0.8rem' }}>{new Date(dep.deposit_date).toLocaleDateString()}</p>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <span className={`badge ${dep.status === 'read' ? 'badge-success' : 'badge-warning'}`}>
                                        {dep.status === 'read' ? 'Leído' : 'Enviado'}
                                    </span>
                                    {dep.status === 'read' && dep.read_at && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                                            <Eye size={12} color="var(--color-success)" />
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                {new Date(dep.read_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default SenderDashboard;
