import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { depositService } from '../services/depositService';
import { useAuth } from '../context/AuthContext';
import { Upload, DollarSign, Calendar, Eye, Activity, UserPlus, Star, Save, Trash2, FileText, X, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { generateDepositReport } from '../utils/pdfGenerator';

const SenderDashboard = () => {
    const { user } = useAuth();
    // ... (keep lines until line 230 approx)


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

    // Report Logic
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportStart, setReportStart] = useState('');
    const [reportEnd, setReportEnd] = useState('');
    const [reportRecipient, setReportRecipient] = useState(''); // New filter
    const [reportWithVoucher, setReportWithVoucher] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

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
            toast.error("No se pudo eliminar. ¿ quizás ya pasó el tiempo permitido?");
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

    const handleGenerateReport = async () => {
        setGeneratingPdf(true);
        const toastId = toast.loading('Generando PDF...');
        try {
            // Filter Data
            const filteredDeposits = deposits.filter(d => {
                const dDate = new Date(d.deposit_date);
                const start = reportStart ? new Date(reportStart) : new Date('2000-01-01');
                const end = reportEnd ? new Date(reportEnd) : new Date();

                // Date Filter
                const dateMatch = dDate >= start && dDate <= end;

                // Recipient Filter
                const recipientMatch = reportRecipient === '' || d.recipient_email === reportRecipient;

                return dateMatch && recipientMatch;
            });

            if (filteredDeposits.length === 0) throw new Error("No hay datos con esos filtros");

            await generateDepositReport({
                deposits: filteredDeposits,
                startDate: reportStart,
                endDate: reportEnd,
                includeImages: reportWithVoucher,
                user: user,
                engineerCredits: "Desarrollado por Ing. Amaro A. Vilela V. | amalviva@gmail.com | 944499069"
            });

            toast.success("PDF Descargado", { id: toastId });
            setShowReportModal(false);
        } catch (e) {
            toast.error(e.message, { id: toastId });
        } finally {
            setGeneratingPdf(false);
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
                            <label className="text-label">E-mail o Nombre Destinatario</label>
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
                                    marginTop: '0.5rem',
                                    background: file ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                                }}
                            >
                                {file ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-success)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <FileText size={16} /> {file.name}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Quitar imagen
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                                        {/* Gallery Option */}
                                        <div
                                            onClick={() => document.getElementById('fileUpload').click()}
                                            style={{ cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                                            className="hover-scale"
                                        >
                                            <div style={{ background: 'var(--bg-surface)', padding: '0.8rem', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}>
                                                <Upload size={24} color="var(--color-primary)" />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Galería</span>
                                            <input
                                                id="fileUpload"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={e => setFile(e.target.files[0])}
                                            />
                                        </div>

                                        {/* Camera Option */}
                                        <div
                                            onClick={() => document.getElementById('cameraUpload').click()}
                                            style={{ cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                                            className="hover-scale"
                                        >
                                            <div style={{ background: 'var(--bg-surface)', padding: '0.8rem', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}>
                                                <Camera size={24} color="var(--color-primary)" />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cámara</span>
                                            <input
                                                id="cameraUpload"
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                style={{ display: 'none' }}
                                                onChange={e => setFile(e.target.files[0])}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                            {submitting ? 'Subiendo...' : 'Registrar Depósito'}
                        </button>
                    </form>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <h3 className="text-h2" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Historial</h3>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}
                            >
                                <FileText size={16} /> Reporte PDF
                            </button>
                        </div>
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
                                                {isToday && dep.sender_id === user.id && (
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
                                            {dep.status === 'read' && dep.read_at && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                                                    <Eye size={12} color="var(--color-success)" />
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(dep.read_at).toLocaleTimeString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '90%', animation: 'slideUp 0.3s ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 className="text-h2" style={{ fontSize: '1.2rem', margin: 0 }}>Generar Reporte PDF</h3>
                            <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
                        </div>

                        <div className="form-group">
                            <label className="text-label">Fecha Inicio</label>
                            <input type="date" className="input-field" value={reportStart} onChange={e => setReportStart(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="text-label">Fecha Fin</label>
                            <input type="date" className="input-field" value={reportEnd} onChange={e => setReportEnd(e.target.value)} />
                        </div>

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="text-label">Filtrar por Destinatario (Opcional)</label>
                            <select
                                className="input-field"
                                value={reportRecipient}
                                onChange={e => setReportRecipient(e.target.value)}
                            >
                                <option value="">-- Todos --</option>
                                {contacts.map(c => (
                                    <option key={c.id} value={c.contact_email}>
                                        {c.contact_name || c.contact_email}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setReportWithVoucher(!reportWithVoucher)}>
                            <div style={{ width: '20px', height: '20px', border: '1px solid var(--border-subtle)', borderRadius: '4px', background: reportWithVoucher ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {reportWithVoucher && <div style={{ width: '10px', height: '10px', background: 'white', borderRadius: '2px' }} />}
                            </div>
                            <span style={{ fontSize: '0.9rem' }}>Incluir Imágenes (Vouchers)</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            * Incluir imágenes puede hacer que el reporte tarde más en generarse.
                        </p>

                        <button
                            onClick={handleGenerateReport}
                            disabled={generatingPdf}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '2rem' }}
                        >
                            {generatingPdf ? 'Generando...' : 'Descargar PDF'}
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default SenderDashboard;
