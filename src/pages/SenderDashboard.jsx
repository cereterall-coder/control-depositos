import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { depositService } from '../services/depositService';
import { useAuth } from '../context/AuthContext';
import { Upload, DollarSign, Calendar, Eye, Activity, UserPlus, Star, Trash2, FileText, X, Camera, Ban, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { generateDepositReport } from '../utils/pdfGenerator';

const SenderDashboard = () => {
    const { user } = useAuth();

    const [deposits, setDeposits] = useState([]);
    const [contacts, setContacts] = useState([]); // Favorites list
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [amount, setAmount] = useState('');
    // Automatically set today's date (Peru Time)
    const [date, setDate] = useState(() => {
        try {
            return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        } catch (e) {
            return new Date().toISOString().split('T')[0];
        }
    });
    const [recipientEmail, setRecipientEmail] = useState('');
    const [observation, setObservation] = useState('');
    const [file, setFile] = useState(null);

    // UI Helper for autocomplete
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Report Logic
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportStart, setReportStart] = useState('');
    const [reportEnd, setReportEnd] = useState('');
    const [reportType, setReportType] = useState('sent'); // 'sent' or 'received'
    const [reportRecipient, setReportRecipient] = useState(''); // New filter
    const [reportWithVoucher, setReportWithVoucher] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Filter Logic Calculation
    const visibleDeposits = deposits.filter(d => {
        // Type Filter (Sent vs Received vs Trash)
        if (reportType === 'sent') {
            if (d.sender_id !== user.id) return false;
            if (d.sender_deleted_at) return false; // Hide deleted
        }
        if (reportType === 'received') {
            if (d.sender_id === user.id) return false;
        }
        if (reportType === 'trash') {
            if (d.sender_id !== user.id) return false; // Only my sent items
            if (!d.sender_deleted_at) return false; // Only deleted items
        }

        if (!reportStart && !reportEnd && !reportRecipient) return true;

        const dDate = new Date(d.deposit_date);
        dDate.setHours(0, 0, 0, 0);

        let dateMatch = true;
        if (reportStart) {
            const start = new Date(reportStart);
            start.setHours(0, 0, 0, 0);
            if (dDate < start) dateMatch = false;
        }
        if (reportEnd) {
            const end = new Date(reportEnd);
            end.setHours(0, 0, 0, 0);
            if (dDate > end) dateMatch = false;
        }

        let recipientMatch = true;
        if (reportRecipient) {
            const otherParty = d.sender_id === user.id ? d.recipient_email : d.sender_email;
            recipientMatch = otherParty === reportRecipient;
        }

        return dateMatch && recipientMatch;
    });

    const totalAmount = visibleDeposits.reduce((sum, d) => sum + Number(d.amount), 0).toFixed(2);

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
        if (!confirm('¿Mover a la papelera?')) return;
        try {
            await depositService.softDeleteDeposit(id);
            toast.success("Movido a papelera");
            refreshData();
        } catch (e) {
            toast.error("Error al eliminar");
        }
    };

    const handleRestore = async (id) => {
        try {
            await depositService.restoreDeposit(id);
            toast.success("Restaurado de papelera");
            refreshData();
        } catch (e) {
            toast.error("Error al restaurar");
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
                // Fix timezone issue: append T12:00:00 so it's noon, avoiding midnight shift
                date: (date ? `${date}T12:00:00` : new Date().toISOString()),
                voucherFile: file,
                recipientEmail,
                senderId: user.id,
                observation
            });

            toast.success('Enviado correctamente', { id: toastId });
            setAmount('');
            // Keep today's date (Peru)
            setDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }));
            setFile(null);

            // Check if is favorite
            const isFav = contacts.some(c => c.contact_email === recipientEmail);
            if (!isFav) {
                askToSaveFavorite(recipientEmail);
            }
            setRecipientEmail('');
            setObservation('');

        } catch (err) {
            toast.error('Error: ' + err.message, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const askToSaveFavorite = (email) => {
        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h2 className="text-h2" style={{ margin: 0 }}>Panel de Envíos</h2>
                <button
                    onClick={() => navigate('/billetera-v3')}
                    style={{ background: 'red', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
                >
                    🔴 IR A BILLETERA V3
                </button>
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
            if (visibleDeposits.length === 0) throw new Error("No hay datos en pantalla para exportar");

            await generateDepositReport({
                deposits: visibleDeposits,
                startDate: reportStart,
                endDate: reportEnd,
                includeImages: reportWithVoucher, // Reuse existing state or rename
                user: user,
                totalAmount: totalAmount,
                engineerCredits: "Desarrollado por Ing. Amaro A. Vilela V. | amalviva@gmail.com | 944499069"
            });

            toast.success("PDF Descargado", { id: toastId });
            setShowReportModal(false); // Just in case
        } catch (e) {
            toast.error(e.message, { id: toastId });
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <DashboardLayout title="Control de Depósitos">
            <div className="dashboard-grid">

                <div className="glass-panel card-padding" style={{ height: 'fit-content' }}>
                    {user?.status && user.status !== 'active' ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <Ban size={32} color="orange" />
                            </div>
                            <h3 style={{ color: 'orange', marginBottom: '0.5rem' }}>Cuenta Restringida</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Tu estado actual es <strong>{user.status === 'pending' ? 'Pendiente' : 'Bloqueado'}</strong>.
                            </p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Contacte al administrador para habilitar el registro de nuevos depósitos.
                            </p>
                        </div>
                    ) : (
                        <>
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
                                                                setRecipientEmail(c.contact_email);
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
                                        <span style={{ position: 'absolute', left: '1rem', top: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.9rem' }}>S/.</span>
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
                                        <Calendar
                                            size={16}
                                            style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 10 }}
                                            onClick={() => document.getElementById('deposit-date').showPicker()}
                                        />
                                        <input
                                            id="deposit-date"
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
                                    <label className="text-label">Observación (Opcional)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Motivo del depósito..."
                                        value={observation}
                                        onChange={e => setObservation(e.target.value)}
                                    />
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
                        </>
                    )}
                </div>

                <div className="glass-panel card-padding">
                    {/* Header + Filters */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h3 className="text-h2" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Historial</h3>
                                {totalAmount > 0 && (
                                    <span style={{
                                        background: 'var(--color-success)',
                                        color: 'white',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '12px',
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold'
                                    }}>
                                        S/. {totalAmount}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                    onClick={() => setReportWithVoucher(!reportWithVoucher)}
                                    title="Incluir imégenes de vouchers en PDF"
                                    style={{
                                        background: reportWithVoucher ? 'var(--color-primary)' : 'transparent',
                                        border: '1px solid var(--border-subtle)',
                                        color: reportWithVoucher ? 'white' : 'var(--text-muted)',
                                        padding: '0.4rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FileText size={16} />
                                </button>
                                <button
                                    onClick={handleGenerateReport}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}
                                    disabled={generatingPdf}
                                >
                                    {generatingPdf ? 'Generando...' : 'Descargar PDF'}
                                </button>
                            </div>
                        </div>

                        {/* Type Toggle */}
                        <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '0.25rem', borderRadius: '8px', marginBottom: '1rem', width: 'fit-content' }}>
                            <button
                                onClick={() => setReportType('sent')}
                                style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: reportType === 'sent' ? 'var(--color-primary)' : 'transparent',
                                    color: reportType === 'sent' ? 'white' : 'var(--text-muted)',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Enviados
                            </button>
                            <button
                                onClick={() => setReportType('received')}
                                style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: reportType === 'received' ? 'var(--color-primary)' : 'transparent',
                                    color: reportType === 'received' ? 'white' : 'var(--text-muted)',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Recibidos
                            </button>
                            <button
                                onClick={() => setReportType('trash')}
                                style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: reportType === 'trash' ? 'var(--color-danger)' : 'transparent',
                                    color: reportType === 'trash' ? 'white' : 'var(--text-muted)',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                                }}
                            >
                                <Trash2 size={14} /> Papelera
                            </button>
                        </div>

                        {/* Filter Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                            <input
                                type="date"
                                className="input-field"
                                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                value={reportStart}
                                onChange={e => setReportStart(e.target.value)}
                                placeholder="Desde"
                            />
                            <input
                                type="date"
                                className="input-field"
                                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                value={reportEnd}
                                onChange={e => setReportEnd(e.target.value)}
                                placeholder="Hasta"
                            />
                            <select
                                className="input-field"
                                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                value={reportRecipient}
                                onChange={e => setReportRecipient(e.target.value)}
                            >
                                <option value="">-- Todos --</option>
                                {/* Combine Contacts + Senders found in history */}
                                {(() => {
                                    const interactors = new Map();

                                    // 1. Add Saved Contacts
                                    contacts.forEach(c => interactors.set(c.contact_email, c.contact_name));

                                    // 2. Add from History
                                    deposits.forEach(d => {
                                        if (d.sender_id === user.id) {
                                            // I sent to this person
                                            if (!interactors.has(d.recipient_email)) {
                                                interactors.set(d.recipient_email, d.recipient_email);
                                            }
                                        } else {
                                            // I received from this person
                                            if (!interactors.has(d.sender_email)) {
                                                interactors.set(d.sender_email, d.sender_name || d.sender_email);
                                            }
                                        }
                                    });

                                    return Array.from(interactors.entries()).map(([email, name]) => (
                                        <option key={email} value={email}>
                                            {name || email}
                                        </option>
                                    ));
                                })()}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {loading ? <p>Cargando datos...</p> : visibleDeposits.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay registros con este filtro.</p> : visibleDeposits.map(dep => {
                                const contactName = contacts.find(c => c.contact_email === dep.recipient_email)?.contact_name || dep.recipient_email;
                                const isToday = new Date(dep.created_at).toDateString() === new Date().toDateString();

                                return (
                                    <div
                                        key={dep.id}
                                        className="glass-panel hover-scale card-item-padding"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                padding: '0.4rem',
                                                background: 'var(--bg-app)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                flexShrink: 0
                                            }}>
                                                <FileText size={16} color="var(--color-primary)" />
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <p className="text-truncate" style={{ fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                                                    {dep.sender_id === user.id ? `Para: ${contactName}` : `De: ${dep.sender_name || 'Sin Nombre'}`}
                                                </p>
                                                {dep.sender_id !== user.id && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>
                                                        {dep.sender_email} {dep.sender_phone && `• ${dep.sender_phone}`}
                                                    </span>
                                                )}
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {new Date(dep.deposit_date).toLocaleDateString()}
                                                </span>
                                                {dep.observation && (
                                                    <p className="text-truncate" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                                        "{dep.observation}"
                                                    </p>
                                                )}

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
                                        </div>

                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p className="price-text">S/. {dep.amount}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginBottom: '0.3rem' }}>
                                                <span className={`badge ${dep.status === 'read' ? 'badge-success' : 'badge-warning'}`}>
                                                    {dep.sender_id === user.id
                                                        ? (dep.status === 'read' ? 'Leído' : 'Enviado')
                                                        : (dep.status === 'read' ? 'Confirmado' : 'Recibido')
                                                    }
                                                </span>

                                                {/* Actions */}
                                                {reportType === 'trash' ? (
                                                    <button
                                                        onClick={() => handleRestore(dep.id)}
                                                        className="btn-icon"
                                                        style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', cursor: 'pointer', border: 'none', padding: '0.15rem', display: 'flex' }}
                                                        title="Restaurar"
                                                    >
                                                        <RefreshCw size={13} />
                                                    </button>
                                                ) : (
                                                    // Delete Button (Only for Sent items created today for now, or relax?)
                                                    // User said "Eliminar solo para enviados". Keeping isToday check for safety or removing?
                                                    // Usually Trash logic allows deleting anytime. Let's keep isToday for now to avoid historical modification, OR relax it since it's soft delete.
                                                    // "Eliminar solo para los depositos enviados".
                                                    // Let's keep existing isToday logic for now to be safe, or ask?
                                                    // Let's relax it? Soft delete is safe.
                                                    (isToday && dep.sender_id === user.id && reportType === 'sent') && (
                                                        <button
                                                            onClick={() => handleDelete(dep.id)}
                                                            className="btn-icon"
                                                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', cursor: 'pointer', border: 'none', padding: '0.15rem', display: 'flex' }}
                                                            title="Mover a papelera"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )
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
        </DashboardLayout>
    );
};

export default SenderDashboard;
