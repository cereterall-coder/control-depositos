import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/depositService';
import { supabase } from '../lib/supabase';
import {
    PlusCircle, List, FileText, Settings,
    Upload, DollarSign, Calendar, Eye, Activity, UserPlus, Star, Trash2, X, Camera, Ban, Link as LinkIcon, RefreshCw, LogOut, User, FilePieChart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateDepositReport } from '../utils/pdfGenerator';
import { useNavigate } from 'react-router-dom';

const SenderDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Tab State: 'new', 'history', 'reports', 'settings'
    const [activeTab, setActiveTab] = useState('new');

    // Data State
    const [deposits, setDeposits] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(() => {
        try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); }
        catch (e) { return new Date().toISOString().split('T')[0]; }
    });
    const [recipientEmail, setRecipientEmail] = useState('');
    const [observation, setObservation] = useState('');
    const [file, setFile] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // History View State
    const [historyLimit, setHistoryLimit] = useState(10);
    const [reportType, setReportType] = useState('sent'); // 'sent', 'received', 'trash'

    // Report/Filter State
    const [reportStart, setReportStart] = useState('');
    const [reportEnd, setReportEnd] = useState('');
    const [reportRecipient, setReportRecipient] = useState('');
    const [reportWithVoucher, setReportWithVoucher] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // About Modal State
    const [showAboutModal, setShowAboutModal] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadInitial = async () => {
            if (user) {
                await refreshData();
            }
        };
        loadInitial();

        // Real-time subscription
        const subscription = supabase
            .channel('public:deposits')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, payload => {
                refreshData();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [user]);

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
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- Computed Data ---
    // Filter Logic for History Tab AND Reports
    const getFilteredDeposits = () => {
        return deposits.filter(d => {
            // Type Filter
            if (reportType === 'sent') {
                if (d.sender_id !== user.id) return false;
                if (d.sender_deleted_at) return false;
            }
            if (reportType === 'received') {
                if (d.sender_id === user.id) return false;
            }
            if (reportType === 'trash') {
                if (d.sender_id !== user.id) return false;
                if (!d.sender_deleted_at) return false;
            }

            // Date/Recipient Filters (Only apply if set, heavily used in Reports tab)
            if (!reportStart && !reportEnd && !reportRecipient) return true;

            const dDate = new Date(d.deposit_date);
            dDate.setHours(0, 0, 0, 0);

            if (reportStart) {
                const start = new Date(reportStart);
                start.setHours(0, 0, 0, 0);
                if (dDate < start) return false;
            }
            if (reportEnd) {
                const end = new Date(reportEnd);
                end.setHours(0, 0, 0, 0);
                if (dDate > end) return false;
            }
            if (reportRecipient) {
                const otherParty = d.sender_id === user.id ? d.recipient_email : d.sender_email;
                if (otherParty !== reportRecipient) return false;
            }

            return true;
        });
    };

    const visibleDeposits = getFilteredDeposits();
    // Sort: Newest First
    const sortedDeposits = [...visibleDeposits].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Limit for Display
    const displayedDeposits = activeTab === 'history' ? sortedDeposits.slice(0, historyLimit) : sortedDeposits;

    const totalAmount = visibleDeposits.reduce((sum, d) => sum + Number(d.amount), 0).toFixed(2);


    // --- Actions ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);
        const toastId = toast.loading('Procesando depósito...');
        try {
            await depositService.createDeposit({
                amount,
                deposit_date: date,
                recipient_email: recipientEmail,
                sender_email: user.email,
                sender_id: user.id,
                observation,
                file
            });
            toast.success('¡Depósito enviado!', { id: toastId });
            // Reset Form and Switch to History
            setAmount('');
            setRecipientEmail('');
            setObservation('');
            setFile(null);
            setActiveTab('history');
            setReportType('sent');
        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setSubmitting(false);
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
            toast.success("Restaurado");
            refreshData();
        } catch (e) {
            toast.error("Error al restaurar");
        }
    };

    const handleGenerateReport = async () => {
        setGeneratingPdf(true);
        const toastId = toast.loading('Generando PDF...');
        try {
            if (visibleDeposits.length === 0) throw new Error("No hay datos para exportar");
            await generateDepositReport({
                deposits: visibleDeposits,
                startDate: reportStart,
                endDate: reportEnd,
                includeImages: reportWithVoucher,
                user: user,
                totalAmount: totalAmount,
                engineerCredits: "Desarrollado por Ing. Amaro A. Vilela V. | amalviva@gmail.com | 944499069"
            });
            toast.success("PDF Descargado", { id: toastId });
        } catch (e) {
            toast.error(e.message, { id: toastId });
        } finally {
            setGeneratingPdf(false);
        }
    };

    // --- Render Helpers ---
    const getTabStyle = (tabName) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0.5rem', flex: 1, cursor: 'pointer',
        color: activeTab === tabName ? 'var(--color-primary)' : 'var(--text-muted)',
        borderTop: activeTab === tabName ? '3px solid var(--color-primary)' : '3px solid transparent',
        background: 'var(--bg-surface)', transition: 'all 0.2s'
    });

    return (
        <div style={{ paddingBottom: '80px', minHeight: '100vh', background: 'var(--bg-app)' }}>

            {/* --- HEADER --- */}
            <div style={{ background: 'var(--bg-surface)', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1
                    onClick={() => setShowAboutModal(true)}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer' }}
                    title="Ver Información del Desarrollador"
                >
                    <img src="/pwa-192x192.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                    Control Depósitos
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>v3.1</span>
                    <div style={{ width: '32px', height: '32px', background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden', border: '2px solid white' }}>
                        {(user.user_metadata?.avatar_url || user.avatar_url) ? (
                            <img src={user.user_metadata?.avatar_url || user.avatar_url} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user.email[0].toUpperCase()
                        )}
                    </div>
                </div>
            </div>

            {/* --- ABOUT MODAL --- */}
            {showAboutModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', animation: 'fadeIn 0.2s' }} onClick={() => setShowAboutModal(false)}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowAboutModal(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>

                        <img src="/pwa-512x512.png" alt="Logo Grande" style={{ width: '120px', height: '120px', borderRadius: '20px', marginBottom: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />

                        <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Control Depósitos</h2>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Versión 3.1 Enterprise</div>

                        <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Desarrollado y Gestionado por:</div>
                            <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Ing. Amaro A. Vilela V.</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', marginTop: '0.5rem' }}>Software Engineer</div>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <p style={{ margin: '0.2rem' }}>📞 944 499 069</p>
                            <p style={{ margin: '0.2rem' }}>📧 amalviva@gmail.com</p>
                        </div>

                        <div style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.6 }}>
                            &copy; 2026 Todos los derechos reservados
                        </div>
                    </div>
                </div>
            )}

            <div className="container" style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>

                {/* --- TAB 1: NUEVO DEPÓSITO --- */}
                {activeTab === 'new' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s' }}>
                        <h2 className="text-h2" style={{ marginBottom: '1.5rem' }}>Nuevo Depósito</h2>
                        <form onSubmit={handleSubmit}>
                            {/* Form Fields (Simplified Layout) */}
                            <div className="form-group">
                                <label className="text-label">Monto (S/.)</label>
                                <div style={{ position: 'relative' }}>
                                    <DollarSign size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input type="number" step="0.01" required className="input-field" style={{ paddingLeft: '2.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}
                                        value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="text-label">Destinatario</label>
                                <div style={{ position: 'relative' }}>
                                    <UserPlus size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                                    <input type="text" required className="input-field" style={{ paddingLeft: '2.5rem' }}
                                        value={recipientEmail} onChange={e => { setRecipientEmail(e.target.value); setShowSuggestions(true); }}
                                        placeholder="Nombre o Correo" onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
                                    {showSuggestions && contacts.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '0 0 8px 8px', zIndex: 10 }}>
                                            {contacts.filter(c => (c.contact_name + c.contact_email).toLowerCase().includes(recipientEmail.toLowerCase())).map(c => (
                                                <div key={c.id} onClick={() => setRecipientEmail(c.contact_email)} style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <strong>{c.contact_name}</strong> <br /><small>{c.contact_email}</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="text-label">Fecha</label>
                                <input type="date" required className="input-field" value={date} onChange={e => setDate(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label className="text-label">Observación</label>
                                <input type="text" className="input-field" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Opcional..." />
                            </div>

                            <div className="form-group">
                                <label className="file-upload-label">
                                    <Upload size={20} />
                                    <span>{file ? file.name : 'Subir Voucher (Imagen)'}</span>
                                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
                                </label>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={submitting}>
                                {submitting ? 'Enviando...' : 'Realizar Depósito'}
                            </button>
                        </form>
                    </div>
                )}

                {/* --- TAB 2: HISTORIAL --- */}
                {activeTab === 'history' && (
                    <div style={{ animation: 'fadeIn 0.3s' }}>
                        {/* Toggle Type */}
                        <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.3rem', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            {['sent', 'received', 'trash'].map(type => (
                                <button key={type} onClick={() => setReportType(type)} style={{
                                    flex: 1, padding: '0.6rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    background: reportType === type ? (type === 'trash' ? 'var(--color-danger)' : 'var(--color-primary)') : 'transparent',
                                    color: reportType === type ? 'white' : 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s'
                                }}>
                                    {type === 'sent' ? 'Enviados' : type === 'received' ? 'Recibidos' : 'Papelera'}
                                </button>
                            ))}
                        </div>

                        {/* Summary Card */}
                        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total en pantalla</span>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary)' }}>S/. {totalAmount}</h3>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                Mostrando {displayedDeposits.length} de {sortedDeposits.length}
                            </div>
                        </div>

                        {/* List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {displayedDeposits.map(dep => {
                                const isToday = new Date().toDateString() === new Date(dep.created_at).toDateString();
                                return (
                                    <div key={dep.id} className="glass-panel" style={{ padding: '1rem', borderLeft: `4px solid ${dep.sender_id === user.id ? 'var(--color-primary)' : 'var(--color-success)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>S/. {dep.amount}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(dep.deposit_date).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                            {dep.sender_id === user.id ? `Para: ${dep.recipient_email}` : `De: ${dep.sender_name || dep.sender_email}`}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className={`badge ${dep.status === 'read' ? 'badge-success' : 'badge-warning'}`}>
                                                {dep.sender_id === user.id
                                                    ? (dep.status === 'read' ? 'Leído' : 'Enviado')
                                                    : (dep.status === 'read' ? 'Confirmado' : 'Recibido')}
                                            </span>

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {dep.voucher_path && (
                                                    <button onClick={() => window.open(depositService.getVoucherUrl(dep.voucher_path), '_blank')} className="btn-icon">
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                {/* Actions */}
                                                {reportType === 'trash' ? (
                                                    <button onClick={() => handleRestore(dep.id)} className="btn-icon" style={{ color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)' }}>
                                                        <RefreshCw size={16} />
                                                    </button>
                                                ) : (
                                                    (dep.sender_id === user.id && reportType === 'sent') && (
                                                        <button onClick={() => handleDelete(dep.id)} className="btn-icon" style={{ color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {sortedDeposits.length > historyLimit && (
                            <button onClick={() => setHistoryLimit(prev => prev + 20)} className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
                                Ver más depósitos
                            </button>
                        )}
                        {sortedDeposits.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No hay movimientos.</p>
                        )}
                    </div>
                )}

                {/* --- TAB 3: REPORTES --- */}
                {activeTab === 'reports' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s' }}>
                        <h2 className="text-h2" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <FilePieChart size={24} /> Reportes PDF
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Configura los filtros para generar tu reporte.
                        </p>

                        <div className="form-group">
                            <label className="text-label">Fecha Inicio</label>
                            <input type="date" className="input-field" value={reportStart} onChange={e => setReportStart(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="text-label">Fecha Fin</label>
                            <input type="date" className="input-field" value={reportEnd} onChange={e => setReportEnd(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="text-label">Usuario</label>
                            <select className="input-field" value={reportRecipient} onChange={e => setReportRecipient(e.target.value)}>
                                <option value="">-- Todos --</option>
                                {(() => {
                                    const interactors = new Map();
                                    contacts.forEach(c => interactors.set(c.contact_email, c.contact_name));
                                    deposits.forEach(d => {
                                        if (d.sender_id === user.id) { if (!interactors.has(d.recipient_email)) interactors.set(d.recipient_email, d.recipient_email); }
                                        else { if (!interactors.has(d.sender_email)) interactors.set(d.sender_email, d.sender_name || d.sender_email); }
                                    });
                                    return Array.from(interactors.entries()).map(([email, name]) => (
                                        <option key={email} value={email}>{name || email}</option>
                                    ));
                                })()}
                            </select>
                        </div>
                        <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                            <input type="checkbox" checked={reportWithVoucher} onChange={e => setReportWithVoucher(e.target.checked)} />
                            <span style={{ color: 'var(--text-secondary)' }}>Incluir fotos de vouchers</span>
                        </label>

                        <button onClick={handleGenerateReport} className="btn btn-primary" style={{ width: '100%' }} disabled={generatingPdf}>
                            {generatingPdf ? 'Generando...' : 'Descargar Reporte PDF'}
                        </button>
                    </div>
                )}

                {/* --- TAB 4: AJUSTES --- */}
                {activeTab === 'settings' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s' }}>
                        <h2 className="text-h2" style={{ marginBottom: '1.5rem' }}>Configuración</h2>

                        {/* User Info Card */}
                        <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '50px', height: '50px', background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', overflow: 'hidden', border: '2px solid white' }}>
                                {(user.user_metadata?.avatar_url || user.avatar_url) ? (
                                    <img src={user.user_metadata?.avatar_url || user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    user.email[0].toUpperCase()
                                )}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user.user_metadata?.full_name || 'Usuario'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user.email}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                                    {user.user_metadata?.role === 'admin' ? '👑 Administrador' : '👤 Cuenta Estándar'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button onClick={() => navigate('/profile')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                <User size={18} /> Mis Datos Personales
                            </button>

                            {/* Admin Link if Admin */}
                            {(user.user_metadata?.role === 'admin' || user.role === 'admin') && (
                                <button onClick={() => navigate('/admin/users')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', background: 'rgba(234,179,8,0.1)', color: 'orange', borderColor: 'orange' }}>
                                    <Star size={18} /> Panel Admin
                                </button>
                            )}

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1rem 0' }} />

                            <button
                                onClick={() => {
                                    if (confirm('¿Seguro que quieres cerrar sesión?')) logout();
                                }}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', background: 'var(--color-danger)', color: 'white', border: 'none', padding: '0.8rem' }}
                            >
                                <LogOut size={18} /> CERRAR SESIÓN
                            </button>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            App v3.1 Mobile • 2026
                        </div>
                    </div>
                )}

            </div>

            {/* --- BOTTOM NAVIGATION BAR --- */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: '70px', background: 'var(--bg-surface)',
                display: 'flex', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                zIndex: 100, paddingBottom: '10px' // Safe area for iPhone
            }}>
                <div onClick={() => setActiveTab('new')} style={getTabStyle('new')}>
                    <PlusCircle size={24} strokeWidth={activeTab === 'new' ? 2.5 : 2} />
                    <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Nuevo</span>
                </div>
                <div onClick={() => setActiveTab('history')} style={getTabStyle('history')}>
                    <List size={24} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
                    <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Historial</span>
                </div>
                <div onClick={() => setActiveTab('reports')} style={getTabStyle('reports')}>
                    <FileText size={24} strokeWidth={activeTab === 'reports' ? 2.5 : 2} />
                    <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Reportes</span>
                </div>
                <div onClick={() => setActiveTab('settings')} style={getTabStyle('settings')}>
                    <Settings size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
                    <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Ajustes</span>
                </div>
            </div>

        </div>
    );
};

export default SenderDashboard;
