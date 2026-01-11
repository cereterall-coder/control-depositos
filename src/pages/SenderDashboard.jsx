import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/depositService';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';
import {
    PlusCircle, List, FileText, Settings,
    Upload, DollarSign, Calendar, Eye, Activity, UserPlus, Star, Trash2, X, Camera, Ban, Link as LinkIcon, RefreshCw, LogOut, User, Users, FilePieChart, Mail, Search, ArrowRight, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateDepositReport } from '../utils/pdfGenerator';
import { useNavigate, Link } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

const SenderDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Tab State - Persistent
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('last_active_tab') || 'new');

    useEffect(() => {
        localStorage.setItem('last_active_tab', activeTab);
    }, [activeTab]);

    // Data State
    const [deposits, setDeposits] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    // Form State with Persistence
    const [amount, setAmount] = useState(() => localStorage.getItem('draft_amount') || '');
    const [date, setDate] = useState(() => {
        const saved = localStorage.getItem('draft_date_fixed');
        if (saved) return saved;
        // Default to Peru Date (YYYY-MM-DD)
        return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    });
    // Recipient starts empty as requested (removed draft_recipient check)
    const [recipientEmail, setRecipientEmail] = useState(() => localStorage.getItem('draft_recipient') || '');
    const [observation, setObservation] = useState(() => localStorage.getItem('draft_observation') || '');

    // Auto-save Draft (only amount and observation now, or update to save recipient but strictly ignore on load?)
    // User wants it empty on enter. So don't load it.
    useEffect(() => {
        localStorage.setItem('draft_amount', amount);
        localStorage.setItem('draft_recipient', recipientEmail);
        localStorage.setItem('draft_date_fixed', date);
        localStorage.setItem('draft_observation', observation);
    }, [amount, recipientEmail, date, observation]);
    const [file, setFile] = useState(null);
    const [historySearch, setHistorySearch] = useState('');
    const [historyStart, setHistoryStart] = useState('');
    const [historyEnd, setHistoryEnd] = useState('');

    const [showSuggestions, setShowSuggestions] = useState(false);

    // Settings State
    const [emailNotify, setEmailNotify] = useState(() => {
        return localStorage.getItem('setting_email_notify') === 'true';
    });

    // Edit Deposit State
    const [editingDeposit, setEditingDeposit] = useState(null);
    const [editFormData, setEditFormData] = useState({ amount: '', date: '', observation: '' });

    useEffect(() => {
        if (editingDeposit) {
            // Ensure date is properly formatted for input type="date" (YYYY-MM-DD)
            let formattedDate = '';
            if (editingDeposit.deposit_date) {
                formattedDate = editingDeposit.deposit_date.split('T')[0]; // Safe split for ISO strings
            }

            setEditFormData({
                amount: editingDeposit.amount,
                date: formattedDate,
                observation: editingDeposit.observation || ''
            });
        }
    }, [editingDeposit]);

    // History View State
    const [historyLimit, setHistoryLimit] = useState(10);
    const [reportType, setReportType] = useState('sent'); // 'sent', 'received', 'trash'

    // Report/Filter State
    const [reportStart, setReportStart] = useState('');
    const [reportEnd, setReportEnd] = useState('');
    const [reportRecipient, setReportRecipient] = useState('');
    const [reportWithVoucher, setReportWithVoucher] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Modals & Tooltips
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showUserTooltip, setShowUserTooltip] = useState(false);
    const [viewingVoucher, setViewingVoucher] = useState(null);

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
    const getFilteredDeposits = () => {
        return deposits.filter(d => {
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

            // History specific filters
            if (activeTab === 'history') {
                if (historySearch) {
                    const searchLower = historySearch.toLowerCase();
                    const matches =
                        (d.recipient_email || '').toLowerCase().includes(searchLower) ||
                        (d.sender_email || '').toLowerCase().includes(searchLower) ||
                        (d.sender_name || '').toLowerCase().includes(searchLower) ||
                        String(d.amount).includes(searchLower) ||
                        (d.observation || '').toLowerCase().includes(searchLower);

                    if (!matches) return false;
                }

                if (historyStart) {
                    const start = new Date(historyStart);
                    start.setHours(0, 0, 0, 0);
                    // Force Local Time for YYYY-MM-DD strings to avoid UTC-5 shift
                    const checkStr = d.deposit_date && !d.deposit_date.includes('T')
                        ? d.deposit_date + 'T12:00:00'
                        : (d.deposit_date || d.created_at);
                    const dDate = new Date(checkStr);
                    if (dDate < start) return false;
                }
                if (historyEnd) {
                    const end = new Date(historyEnd);
                    end.setHours(23, 59, 59, 999);
                    const checkStr = d.deposit_date && !d.deposit_date.includes('T')
                        ? d.deposit_date + 'T12:00:00'
                        : (d.deposit_date || d.created_at);
                    const dDate = new Date(checkStr);
                    if (dDate > end) return false;
                }
            } else {
                // Report filters (Advanced)
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
            }

            return true;
        });
    };

    const visibleDeposits = getFilteredDeposits();
    const sortedDeposits = [...visibleDeposits].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const displayedDeposits = activeTab === 'history' ? sortedDeposits.slice(0, historyLimit) : sortedDeposits;
    const totalAmount = visibleDeposits.reduce((sum, d) => sum + Number(d.amount), 0).toFixed(2);

    // --- Actions ---
    const toggleEmailNotify = () => {
        const newValue = !emailNotify;
        setEmailNotify(newValue);
        localStorage.setItem('setting_email_notify', String(newValue));
        toast.success(newValue ? 'Notificaciones por correo activadas' : 'Notificaciones desactivadas');
    };

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
                sender_id: user.id,
                observation,
                file
            });
            toast.success('¡Depósito enviado!', { id: toastId });
            await refreshData(); // Update history immediately

            // 1. Verify if it is a valid email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmail = emailRegex.test(recipientEmail);

            // 2. Send Automatic Email Notification ONLY if valid email AND enabled
            if (isEmail && emailNotify) {
                const recipientName = contacts.find(c => c.contact_email === recipientEmail)?.contact_name || recipientEmail;

                toast.promise(
                    notificationService.sendDepositAlert({
                        to_email: recipientEmail,
                        to_name: recipientName,
                        from_name: user.user_metadata?.full_name || user.email,
                        amount: amount,
                        date: date,
                        link: window.location.origin
                    }),
                    {
                        loading: 'Enviando notificación por correo...',
                        success: '¡Correo de alerta enviado!',
                        error: (err) => `No se pudo enviar el correo: ${err.error || err.message}`
                    }
                );
            }

            // 3. Prompt to Add to Favorites (if not exists)
            const existsInContacts = contacts.some(c =>
                c.contact_email.toLowerCase() === recipientEmail.toLowerCase() ||
                c.contact_name.toLowerCase() === recipientEmail.toLowerCase()
            );

            if (!existsInContacts) {
                // Small delay to let the toast finish or not block UI immediately
                setTimeout(async () => {
                    if (window.confirm(`¿Deseas guardar a "${recipientEmail}" en tus favoritos para la próxima vez?`)) {
                        try {
                            await depositService.addContact(user.id, recipientEmail, recipientEmail); // Use same value for name/email if simple
                            toast.success("Contacto guardado en favoritos");
                            refreshData(); // Refresh list
                        } catch (e) {
                            console.error(e);
                            toast.error("Error al guardar contacto");
                        }
                    }
                }, 500);
            }

            setAmount('');
            setRecipientEmail('');
            setObservation('');

            // Clear drafts
            localStorage.removeItem('draft_amount');
            localStorage.removeItem('draft_recipient');
            localStorage.removeItem('draft_observation');
            localStorage.removeItem('draft_date_fixed');
            setFile(null);
            setActiveTab('history');
            setReportType('sent');
        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (id, updates) => {
        try {
            await depositService.updateDeposit(id, updates);
            toast.success("Depósito actualizado");
            setEditingDeposit(null);
            // Force reload to ensure all state is perfectly synced
            setTimeout(() => window.location.reload(), 1000);
        } catch (e) {
            toast.error("Error al actualizar: " + e.message);
            console.error(e);
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
                engineerCredits: localStorage.getItem('dev_name') || "Desarrollado por Ing. Amaro A. Vilela V. | amalviva@gmail.com | 944499069"
            });
            toast.success("PDF Descargado", { id: toastId });
        } catch (e) {
            toast.error(e.message, { id: toastId });
        } finally {
            setGeneratingPdf(false);
        }
    };

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

                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}
                    onMouseEnter={() => setShowUserTooltip(true)}
                    onMouseLeave={() => setShowUserTooltip(false)}
                >
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>v3.1</span>

                    {/* User Avatar with Popover */}
                    <div
                        onClick={() => setShowUserTooltip(!showUserTooltip)}
                        style={{ width: '32px', height: '32px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer', position: 'relative', boxShadow: '0 2px 5px rgba(37, 99, 235, 0.3)' }}
                    >
                        {(user.user_metadata?.avatar_url || user.avatar_url) ? (
                            <img src={user.user_metadata?.avatar_url || user.avatar_url} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user.email[0].toUpperCase()
                        )}
                    </div>

                    {/* Popover */}
                    {showUserTooltip && (
                        <div style={{
                            position: 'absolute', top: '120%', right: 0,
                            background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                            padding: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)',
                            width: 'max-content', zIndex: 60, animation: 'fadeIn 0.2s', minWidth: '180px', color: 'white'
                        }}>
                            <div style={{ position: 'absolute', top: '-6px', right: '10px', width: '12px', height: '12px', background: 'rgba(15, 23, 42, 0.95)', transform: 'rotate(45deg)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>

                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem', wordBreak: 'break-all' }}>{user.email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>ROL:</span>
                                {(user.role === 'admin' || user.user_metadata?.role === 'admin') ? 'Administrador' : 'Usuario'}
                            </div>

                            <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <button
                                    onClick={logout}
                                    style={{
                                        background: '#2563eb', color: 'white', border: 'none',
                                        borderRadius: '6px', padding: '0.5rem 1rem', width: '100%',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                                    }}
                                >
                                    <LogOut size={14} />
                                    Cerrar Sesión
                                </button>
                            </div>


                        </div>
                    )}
                </div>
            </div>

            {/* --- ABOUT "AUTHORSHIP" MODAL --- */}
            {/* --- ABOUT "AUTHORSHIP" MODAL --- */}
            {showAboutModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', animation: 'fadeIn 0.2s', backdropFilter: 'blur(5px)' }} onClick={() => setShowAboutModal(false)}>
                    <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', padding: '2.5rem', borderRadius: '30px', textAlign: 'center', maxWidth: '400px', width: '100%', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>

                        <button onClick={() => setShowAboutModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                            <X size={18} />
                        </button>

                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                            <div style={{ position: 'absolute', inset: '-5px', background: 'linear-gradient(45deg, #3b82f6, #ec4899)', borderRadius: '24px', filter: 'blur(10px)', opacity: 0.6 }}></div>
                            <img src="/pwa-512x512.png" alt="Logo Grande" style={{ width: '120px', height: '120px', borderRadius: '20px', position: 'relative', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }} />
                        </div>

                        <h2 style={{ color: 'white', marginBottom: '0.2rem', fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Control Depósitos</h2>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>Versión 3.1 Enterprise</div>

                        {/* Credits Section */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {/* Allow Admin to Edit Authorship */}
                            {(user.role === 'admin' || user.user_metadata?.role === 'admin') && (
                                <button
                                    onClick={() => {
                                        const newName = prompt("Nombre del Desarrollador:", localStorage.getItem('dev_name') || "Ing. Amaro A. Vilela V.");
                                        if (newName !== null) {
                                            localStorage.setItem('dev_name', newName);
                                            const newPhone = prompt("Teléfono:", localStorage.getItem('dev_phone') || "944 499 069");
                                            localStorage.setItem('dev_phone', newPhone || "");
                                            const newEmail = prompt("Email:", localStorage.getItem('dev_email') || "amalviva@gmail.com");
                                            localStorage.setItem('dev_email', newEmail || "");

                                            // Force re-render close/open
                                            setShowAboutModal(false);
                                            setTimeout(() => setShowAboutModal(true), 50);
                                        }
                                    }}
                                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(59, 130, 246, 0.2)', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '5px', borderRadius: '6px' }}
                                    title="Editar Autoría"
                                >
                                    <Settings size={14} />
                                </button>
                            )}

                            <div style={{ fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.5rem', color: '#cbd5e1' }}>Desarrollado por:</div>
                            <div style={{ fontSize: '1.2rem', color: 'white', fontWeight: 'bold', background: 'linear-gradient(90deg, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {localStorage.getItem('dev_name') || "Ing. Amaro A. Vilela V."}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#60a5fa', marginTop: '0.3rem', fontWeight: '500' }}>Ingeniero de Software</div>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span style={{ opacity: 0.7 }}>📞</span> {localStorage.getItem('dev_phone') || "944 499 069"}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span style={{ opacity: 0.7 }}>📧</span> {localStorage.getItem('dev_email') || "amalviva@gmail.com"}
                            </div>
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
                            {/* 1. Recipient (Destinatario) - Moved to Top */}
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

                            {/* 2. Amount (Monto) */}
                            <div className="form-group">
                                <label className="text-label">Monto (S/.)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '1rem' }}>S/.</span>
                                    <input type="number" step="0.01" required className="input-field" style={{ paddingLeft: '3rem', fontSize: '1.2rem', fontWeight: 'bold' }}
                                        value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>

                            {/* 3. Date (Fecha) - Added Calendar Icon & Trigger */}
                            <div className="form-group">
                                <label className="text-label">Fecha</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar
                                        size={18}
                                        style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
                                        onClick={() => document.getElementById('deposit-date-picker').showPicker()}
                                    />
                                    <input
                                        id="deposit-date-picker"
                                        type="date"
                                        required
                                        className="input-field"
                                        style={{ paddingLeft: '2.5rem' }}
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="text-label">Observación</label>
                                <input type="text" className="input-field" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Opcional..." />
                            </div>

                            <div className="form-group">
                                <label className="text-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Comprobante (Voucher)</label>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {/* Option 1: Gallery/File */}
                                    <label className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.8rem' }}>
                                        <Upload size={20} />
                                        <span>Galería</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => e.target.files[0] && setFile(e.target.files[0])}
                                            style={{ display: 'none' }}
                                        />
                                    </label>

                                    {/* Option 2: Camera (Direct Capture) */}
                                    <label className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.8rem', background: 'rgba(37,99,235,0.1)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                                        <Camera size={20} />
                                        <span>Cámara</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={e => e.target.files[0] && setFile(e.target.files[0])}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>

                                {/* Preview / Selected File Name */}
                                {file && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-app)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                            <FileText size={16} color="var(--color-primary)" />
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                                                {file.name}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem', background: '#2563eb', color: 'white', border: 'none' }} disabled={submitting}>
                                {submitting ? 'Enviando...' : 'Registrar Depósito'}
                            </button>
                        </form>
                    </div>
                )}

                {/* --- TAB 2: HISTORIAL --- */}
                {activeTab === 'history' && (
                    <div style={{ animation: 'fadeIn 0.3s' }}>
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

                        {/* HISTORY FILTERS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                            {/* Search Bar */}
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Buscar por nombre, correo, monto..."
                                    value={historySearch}
                                    onChange={e => setHistorySearch(e.target.value)}
                                    style={{ paddingLeft: '2.5rem', height: '40px', width: '100%' }}
                                />
                                {historySearch && (
                                    <button onClick={() => setHistorySearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
                                )}
                            </div>

                            {/* Date Range */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Desde:</label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar
                                            size={16}
                                            style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 1 }}
                                            onClick={() => document.getElementById('history-start-picker').showPicker()}
                                        />
                                        <input
                                            id="history-start-picker"
                                            type="date"
                                            className="input-field"
                                            value={historyStart}
                                            onChange={e => setHistoryStart(e.target.value)}
                                            style={{ height: '38px', width: '100%', paddingLeft: '2rem' }}
                                        />
                                        {historyStart && (
                                            <button onClick={() => setHistoryStart('')} style={{ position: 'absolute', right: '-8px', top: '-8px', background: 'var(--color-danger)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><X size={10} /></button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Hasta:</label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar
                                            size={16}
                                            style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 1 }}
                                            onClick={() => document.getElementById('history-end-picker').showPicker()}
                                        />
                                        <input
                                            id="history-end-picker"
                                            type="date"
                                            className="input-field"
                                            value={historyEnd}
                                            onChange={e => setHistoryEnd(e.target.value)}
                                            style={{ height: '38px', width: '100%', paddingLeft: '2rem' }}
                                        />
                                        {historyEnd && (
                                            <button onClick={() => setHistoryEnd('')} style={{ position: 'absolute', right: '-8px', top: '-8px', background: 'var(--color-danger)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><X size={10} /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total en pantalla</span>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary)' }}>S/. {totalAmount}</h3>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                Mostrando {displayedDeposits.length} de {sortedDeposits.length}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {displayedDeposits.map(dep => {
                                return (
                                    <div key={dep.id} className="glass-panel" style={{ padding: '1rem', borderLeft: `4px solid ${dep.sender_id === user.id ? 'var(--color-primary)' : 'var(--color-success)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>S/. {dep.amount}</span>
                                            {/* Fix: Display raw date parts to avoid timezone shift */}
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {dep.deposit_date
                                                    ? dep.deposit_date.split('-').reverse().join('/')
                                                    : new Date(dep.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                            {dep.sender_id === user.id ? `Para: ${dep.recipient_email}` : `De: ${dep.sender_name || dep.sender_email}`}
                                        </div>
                                        {dep.observation && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>"{dep.observation}"</div>}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className={`badge ${dep.status === 'read' ? 'badge-success' : 'badge-warning'}`}>
                                                {dep.sender_id === user.id
                                                    ? (dep.status === 'read' ? 'Leído' : 'Enviado')
                                                    : (dep.status === 'read' ? 'Confirmado' : 'Recibido')}
                                            </span>

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {dep.voucher_url && (
                                                    <button onClick={() => setViewingVoucher(depositService.getVoucherUrl(dep.voucher_url))} className="btn-icon" title="Ver Voucher">
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                {reportType === 'trash' ? (
                                                    <button onClick={() => handleRestore(dep.id)} className="btn-icon" style={{ color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)' }} title="Restaurar">
                                                        <RefreshCw size={16} />
                                                    </button>
                                                ) : (
                                                    (dep.sender_id === user.id && reportType === 'sent') && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingDeposit(dep)}
                                                                className="btn-icon"
                                                                style={{ color: 'var(--color-primary)', background: 'rgba(59,130,246,0.1)' }}
                                                                title="Editar"
                                                            >
                                                                <Settings size={16} />
                                                            </button>
                                                            <button onClick={() => handleDelete(dep.id)} className="btn-icon" style={{ color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)' }} title="Eliminar">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
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

                {/* --- IMAGE VIEWER MODAL --- */}
                {viewingVoucher && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.95)', zIndex: 300,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        animation: 'fadeIn 0.2s'
                    }} onClick={() => setViewingVoucher(null)}>

                        {/* Top Bar for Controls */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                            zIndex: 310
                        }}>
                            <button
                                onClick={() => setViewingVoucher(null)}
                                className="btn"
                                style={{
                                    background: 'white', color: 'black', border: 'none',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '30px'
                                }}
                            >
                                <ArrowLeft size={18} /> Regresar
                            </button>

                            <button
                                onClick={() => setViewingVoucher(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)', border: 'none',
                                    color: 'white', borderRadius: '50%', width: '40px', height: '40px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Image Container */}
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', boxSizing: 'border-box' }}>
                            <img
                                src={viewingVoucher}
                                alt="Comprobante"
                                style={{
                                    maxWidth: '100%', maxHeight: '85vh',
                                    objectFit: 'contain',
                                    borderRadius: '8px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                                }}
                                onClick={e => e.stopPropagation()} // Prevent closing when clicking image
                            />
                        </div>
                    </div>
                )}

                {/* --- EDIT DEPOSIT MODAL --- */}
                {editingDeposit && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', animation: 'fadeIn 0.2s' }}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', background: 'var(--bg-surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Editar Depósito</h3>
                                <button onClick={() => setEditingDeposit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleEditSubmit(editingDeposit.id, {
                                    amount: parseFloat(editFormData.amount),
                                    deposit_date: editFormData.date,
                                    observation: editFormData.observation
                                });
                            }}>
                                <div className="form-group">
                                    <label className="text-label">Monto (S/.)</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        step="0.01"
                                        value={editFormData.amount}
                                        onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-label">Fecha</label>
                                    <input
                                        name="date"
                                        type="date"
                                        value={editFormData.date}
                                        onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-label">Observación</label>
                                    <input
                                        name="observation"
                                        type="text"
                                        value={editFormData.observation}
                                        onChange={e => setEditFormData({ ...editFormData, observation: e.target.value })}
                                        className="input-field"
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Guardar Cambios</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: REPORTES --- */}
                {activeTab === 'reports' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s' }}>
                        <h2 className="text-h2" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <FilePieChart size={24} /> Reportes PDF
                        </h2>

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

                {/* --- TAB 5: MÉTRICAS (Admin) --- */}
                {activeTab === 'metrics' && (
                    <div style={{ animation: 'fadeIn 0.3s' }}>
                        <AdminDashboard isTab={true} />
                    </div>
                )}

                {/* --- TAB 4: AJUSTES (Diseño Prolijo & Azul) --- */}
                {activeTab === 'settings' && (
                    <div className="glass-panel" style={{ padding: '0', animation: 'fadeIn 0.3s', overflow: 'hidden', background: 'rgba(30, 41, 59, 0.7)' }}>
                        {/* 1. Header with Profile */}
                        <div style={{ padding: '2rem 1.5rem', background: 'linear-gradient(135deg, var(--color-primary), #1e40af)', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--bg-surface)', color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 'bold'
                                }}>
                                    {(user.user_metadata?.avatar_url || user.avatar_url) ? (
                                        <img src={user.user_metadata?.avatar_url || user.avatar_url} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : (
                                        user.email[0].toUpperCase()
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{user.user_metadata?.full_name || 'Usuario'}</h2>
                                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{user.email}</p>
                                    <div style={{ marginTop: '0.4rem', display: 'inline-block', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '0.7rem' }}>
                                        {(user.role === 'admin' || user.user_metadata?.role === 'admin') ? '👑 Administrador' : '👤 Cuenta Estándar'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Settings Menu List */}
                        <div style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

                                {/* Item: My Profile */}
                                <div onClick={() => navigate('/profile')} className="settings-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', cursor: 'pointer', transition: 'transform 0.2s' }}>
                                    <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#60a5fa' }}>
                                        <User size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '500' }}>Mis Datos Personales</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Editar perfil y contraseña</div>
                                    </div>
                                    <ArrowRight size={16} color="var(--text-muted)" />
                                </div>

                                {/* Item: Email Notifications */}
                                <div className="settings-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#60a5fa' }}>
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>Notificaciones</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alertas por correo</div>
                                        </div>
                                    </div>
                                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                                        <input type="checkbox" checked={emailNotify} onChange={toggleEmailNotify} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: emailNotify ? '#3b82f6' : '#64748b', borderRadius: '34px', transition: '.4s' }}>
                                            <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: emailNotify ? '19px' : '3px', bottom: '2px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s' }}></span>
                                        </span>
                                    </label>
                                </div>

                                {/* Item: Admin Panel (If Admin) */}
                                {(user.user_metadata?.role === 'admin' || user.role === 'admin') && (
                                    <div onClick={() => navigate('/admin/users')} className="settings-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', cursor: 'pointer', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                        <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '8px', color: '#60a5fa' }}>
                                            <Users size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '500', color: '#93c5fd' }}>Gestión de Usuarios</div>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Panel Administrativo</div>
                                        </div>
                                        <ArrowRight size={16} color="#60a5fa" />
                                    </div>
                                )}

                                {/* Danger Zone (Blue Theme) */}
                                {(user.role === 'admin' || user.user_metadata?.role === 'admin') && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ padding: '1rem', border: '1px solid #1e40af', borderRadius: '12px', background: 'rgba(30, 58, 138, 0.3)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#60a5fa' }}>
                                                <Ban size={18} />
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Reinicio del Sistema</span>
                                            </div>
                                            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                                                Eliminar historial de depósitos. Requiere código.
                                            </p>
                                            <button
                                                onClick={async () => {
                                                    const now = new Date();
                                                    const day = String(now.getDate()).padStart(2, '0');
                                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                                    const expectedCode = `02855470${day}${month}`;
                                                    const inputCode = window.prompt(`🔒 CÓDIGO DE AUTORIZACIÓN:\nBase: 02855470 + Día + Mes`);
                                                    if (inputCode === expectedCode) {
                                                        try {
                                                            const toastId = toast.loading("Procesando reinicio...");
                                                            await depositService.deleteAllDeposits();
                                                            toast.success("✅ Reinicio Exitoso", { id: toastId });
                                                            setTimeout(() => window.location.reload(), 1500);
                                                        } catch (e) { toast.error("Error: " + e.message); }
                                                    } else if (inputCode !== null) { toast.error("❌ Código Incorrecto"); }
                                                }}
                                                style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}
                                            >
                                                Limpiar Historial de Datos
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginTop: '1rem' }}>
                                    <button
                                        onClick={() => { if (confirm('¿Cerrar Sesión?')) logout(); }}
                                        style={{ width: '100%', padding: '1rem', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <LogOut size={18} /> Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* --- BOTTOM NAVIGATION BAR --- */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: '70px', background: 'var(--bg-surface)',
                display: 'flex', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                zIndex: 100, paddingBottom: '10px'
            }}>
                <div onClick={() => {
                    setAmount('');
                    setRecipientEmail('');
                    setObservation('');
                    setFile(null);
                    setDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }));
                    setActiveTab('new');
                }} style={getTabStyle('new')}>
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

                {(user.role === 'admin' || user.user_metadata?.role === 'admin') && (
                    <div onClick={() => setActiveTab('metrics')} style={getTabStyle('metrics')}>
                        <Activity size={24} strokeWidth={activeTab === 'metrics' ? 2.5 : 2} />
                        <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Métricas</span>
                    </div>
                )}
            </div>

        </div>
    );
};

export default SenderDashboard;
