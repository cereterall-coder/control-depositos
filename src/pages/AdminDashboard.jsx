import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/depositService';
import {
    LayoutDashboard, TrendingUp, Users, DollarSign, Calendar, ArrowLeft,
    CheckCircle, Clock, XCircle, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalAmount: 0,
        todayAmount: 0,
        monthAmount: 0,
        totalDeposits: 0,
        pendingCount: 0,
        deposits: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const allDeposits = await depositService.getAllDeposits();

                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                let total = 0;
                let today = 0;
                let month = 0;
                let pending = 0;

                allDeposits.forEach(d => {
                    const amt = parseFloat(d.amount) || 0;
                    const dDate = new Date(d.deposit_date || d.created_at);

                    total += amt;

                    // Today
                    if ((d.deposit_date === todayStr) || (dDate.toISOString().split('T')[0] === todayStr)) {
                        today += amt;
                    }

                    // This Month
                    if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
                        month += amt;
                    }

                    if (d.status !== 'read') pending++; // Assuming 'read' = confirmed/processed
                });

                setStats({
                    totalAmount: total,
                    todayAmount: today,
                    monthAmount: month,
                    totalDeposits: allDeposits.length,
                    pendingCount: pending,
                    deposits: allDeposits.slice(0, 10) // Top 10 recent
                });
            } catch (e) {
                console.error("Error loading admin stats", e);
            } finally {
                setLoading(false);
            }
        };

        if (user) loadStats();
    }, [user]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Cargando Panel Admin...</div>;

    const Card = ({ title, value, icon: Icon, color, subtext }) => (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{title}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
                </div>
                <div style={{ padding: '0.8rem', borderRadius: '12px', background: `${color}20`, color: color }}>
                    <Icon size={24} />
                </div>
            </div>
            {subtext && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{subtext}</div>}
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', padding: '1rem', paddingBottom: '80px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                    <ArrowLeft size={18} /> Volver
                </Link>
                <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LayoutDashboard color="#60a5fa" />
                    Panel Maestro
                </h1>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <Card
                    title="Recaudado Hoy"
                    value={`S/ ${stats.todayAmount.toFixed(2)}`}
                    icon={DollarSign}
                    color="#10b981"
                />
                <Card
                    title="Este Mes"
                    value={`S/ ${stats.monthAmount.toFixed(2)}`}
                    icon={Calendar}
                    color="#3b82f6"
                />
                <Card
                    title="Total Histórico"
                    value={`S/ ${stats.totalAmount.toFixed(2)}`}
                    icon={TrendingUp}
                    color="#8b5cf6"
                />
                <Card
                    title="Depósitos Totales"
                    value={stats.totalDeposits}
                    icon={FileText}
                    color="#f59e0b"
                />
            </div>

            {/* Recent Activity Section */}
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} /> Actividad Reciente (Global)
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {stats.deposits.map(d => (
                    <div key={d.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', fontWeight: 'bold'
                            }}>
                                {d.sender_email ? d.sender_email[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{d.sender_email || 'Desconocido'}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(d.deposit_date || d.created_at).toLocaleDateString()} • {d.recipient_email}
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>S/ {d.amount}</div>
                            <div style={{ fontSize: '0.75rem', color: d.status === 'read' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                {d.status === 'read' ? 'Confirmado' : 'Pendiente'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <h2 style={{ fontSize: '1.2rem', margin: '2rem 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> Gestión
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Link to="/admin/users" className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', textDecoration: 'none', color: 'white', display: 'block', transition: 'transform 0.2s' }}>
                    <Users size={32} style={{ marginBottom: '0.5rem', color: '#60a5fa' }} />
                    <div style={{ fontWeight: 'bold' }}>Usuarios</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gestionar accesos</div>
                </Link>
                {/* Placeholder for Approval Queue */}
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.7, cursor: 'not-allowed' }}>
                    <CheckCircle size={32} style={{ marginBottom: '0.5rem', color: '#10b981' }} />
                    <div style={{ fontWeight: 'bold' }}>Aprobaciones</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Próximamente</div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
