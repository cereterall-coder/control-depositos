import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { depositService } from '../services/depositService';
import { useAuth } from '../context/AuthContext';
import { Download, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Independent Recipient Dashboard if they navigate here
const RecipientDashboard = () => {
    const { user } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        if (!user) return;
        const data = await depositService.getDeposits(user.email, user.id);
        // Filter only received? 
        // The service returns both sent/received. Let's filter client side for specific view
        const received = data.filter(d => d.recipient_email === user.email);
        setDeposits(received);
        setLoading(false);
    };

    useEffect(() => {
        refreshData();
        const subscription = supabase
            .channel('recipient_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => refreshData())
            .subscribe();

        return () => { supabase.removeChannel(subscription); }
    }, [user]);

    const handleMarkAsRead = async (id, currentStatus) => {
        if (currentStatus === 'read') return;
        await depositService.markAsRead(id);
        refreshData();
    };

    const handleViewVoucher = async (path) => {
        const url = await depositService.getVoucherUrl(path);
        if (url) window.open(url, '_blank');
    };

    const unreadCount = deposits.filter(d => d.status === 'sent').length;

    return (
        <DashboardLayout title="Billetera (Destino)" notificationCount={unreadCount}>
            {/* Simplified View Logic similar to previous mock but connected to real data */}
            {/* ... (Logic is identical to previous RecipientDashboard but calling handleViewVoucher) ... */}
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
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-success)' }}>${dep.amount}</span>
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

export default RecipientDashboard;
