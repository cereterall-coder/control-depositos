import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { depositService } from '../services/depositService';
import { useAuth } from '../context/AuthContext';
import { Download, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const RecipientDashboardV2 = () => {
    const { user } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        if (!user) return;
        try {
            const data = await depositService.getDeposits(user.email, user.id);
            const received = data.filter(d => d.recipient_email === user.email);
            setDeposits(received);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
        const subscription = supabase
            .channel('recipient_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deposits' }, (payload) => {
                if (payload.new.recipient_email === user.email) {
                    toast('¡Has recibido un nuevo depósito!', {
                        icon: '💸',
                        duration: 6000,
                        style: { background: 'var(--color-success)', color: 'white' }
                    });
                    refreshData();
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deposits' }, () => refreshData())
            .subscribe();

        return () => { supabase.removeChannel(subscription); }
    }, [user]);

    const handleMarkAsRead = async (id, currentStatus) => {
        if (currentStatus === 'read') return;
        try {
            await depositService.markAsRead(id);
            toast.success("Confirmado como Recibido");
            refreshData();
        } catch (e) {
            toast.error("Error al confirmar");
        }
    };

    const handleViewVoucher = async (path) => {
        const url = await depositService.getVoucherUrl(path);
        if (url) window.open(url, '_blank');
        else toast.error("No se pudo cargar la imagen");
    };

    const unreadCount = deposits.filter(d => d.status === 'sent').length;

    return (
        <DashboardLayout title="Billetera (Destino) v2" notificationCount={unreadCount}>
            {unreadCount > 0 && (
                <div className="animate-fade-in" style={{ padding: '1rem', background: 'var(--color-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: 'white' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <AlertCircle />
                        <span>Tienes {unreadCount} depósitos sin confirmar.</span>
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3>Depósitos Recibidos</h3>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    {deposits.map(dep => (
                        <div key={dep.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-success)' }}>S/. {dep.amount}</span>
                                <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 'bold' }}>
                                    {dep.sender_name || 'Sin Nombre'}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {dep.sender_email} {dep.sender_phone && `• ${dep.sender_phone}`}
                                </span>
                            </div>
                            <span>{new Date(dep.deposit_date).toLocaleDateString()}</span>

                            {dep.voucher_url ? (
                                <button onClick={() => handleViewVoucher(dep.voucher_url)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                    <Download size={14} /> Voucher
                                </button>
                            ) : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin Voucher</span>}

                            {dep.status === 'sent' ? (
                                <button onClick={() => handleMarkAsRead(dep.id, dep.status)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>Confirmar</button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)' }}>
                                    <Check size={16} /> Confirmado
                                </div>
                            )}
                        </div>
                    ))}
                    {deposits.length === 0 && <p>No has recibido depósitos aún.</p>}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default RecipientDashboardV2;
