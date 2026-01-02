import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { depositService } from '../services/depositService';
import { useAuth } from '../context/AuthContext';
import { Upload, DollarSign, Calendar, Eye, Activity, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const SenderDashboard = () => {
    const { user } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [file, setFile] = useState(null);

    const refreshData = async () => {
        if (!user) return;
        try {
            const data = await depositService.getDeposits(user.email, user.id);
            setDeposits(data);
        } catch (e) {
            console.error("Error fetching", e);
            toast.error("Error al cargar historial");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
        const subscription = supabase
            .channel('deposits_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, payload => {
                if (payload.eventType === 'UPDATE' && payload.new.status === 'read' && payload.new.sender_id === user.id) {
                    toast.success('¡Han visto tu depósito!', { icon: '👀' });
                }
                refreshData();
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const toastId = toast.loading('Procesando envío seguro...');

        try {
            await depositService.addDeposit({
                amount: parseFloat(amount),
                date: date || new Date().toISOString(),
                voucherFile: file,
                recipientEmail,
                senderId: user.id
            });

            setAmount('');
            setDate('');
            setFile(null);
            toast.success('Depósito registrado correctamente', { id: toastId });
        } catch (err) {
            toast.error('Error: ' + err.message, { id: toastId });
        } finally {
            setSubmitting(false);
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
                        <div className="form-group">
                            <label className="text-label">Email Destinatario</label>
                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                <UserPlus size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    required
                                    placeholder="ej. esposa@email.com"
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={recipientEmail}
                                    onChange={e => setRecipientEmail(e.target.value)}
                                />
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
                                        <span className="text-label" style={{ fontSize: '0.7rem' }}>
                                            {dep.sender_id === user.id ? `Para: ${dep.recipient_email}` : `De: ${dep.sender_id.slice(0, 5)}...`}
                                        </span>
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

                        {deposits.length === 0 && !loading && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                No hay depósitos registrados aún.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default SenderDashboard;
