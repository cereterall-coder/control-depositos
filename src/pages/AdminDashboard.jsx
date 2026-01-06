import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/depositService';
import {
    LayoutDashboard, TrendingUp, Users, DollarSign, Calendar, ArrowLeft,
    CheckCircle, Clock, XCircle, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = ({ isTab = false }) => {
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
                const monthlyAgg = {};

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

                    // Chart
                    const key = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
                    monthlyAgg[key] = (monthlyAgg[key] || 0) + amt;
                });

                // Format Chart Data
                const chartData = Object.entries(monthlyAgg)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .slice(-6)
                    .map(([key, value]) => {
                        const [y, m] = key.split('-');
                        const monthName = new Date(parseInt(y), parseInt(m) - 1, 1)
                            .toLocaleDateString('es-ES', { month: 'short' });
                        return { label: monthName, value };
                    });

                setStats({
                    totalAmount: total,
                    todayAmount: today,
                    monthAmount: month,
                    totalDeposits: allDeposits.length,
                    pendingCount: pending,
                    deposits: allDeposits.slice(0, 10), // Top 10 recent
                    chartData
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
        <div style={{ minHeight: isTab ? 'auto' : '100vh', background: isTab ? 'transparent' : 'var(--bg-app)', padding: isTab ? '0' : '1rem', paddingBottom: '80px' }}>
            {/* Header - Only show if NOT a tab */}
            {!isTab && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <Link to="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                        <ArrowLeft size={18} /> Volver
                    </Link>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LayoutDashboard color="#60a5fa" />
                        Panel Maestro
                    </h1>
                </div>
            )}

            {isTab && (
                <h2 className="text-h2" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'white' }}>
                    <LayoutDashboard size={24} /> Métricas & Gestión
                </h2>
            )}

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

            {/* Monthly Chart */}
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} /> Tendencia Mensual
            </h2>
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px' }}>
                {(() => {
                    if (!stats.chartData || stats.chartData.length === 0) return <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>Sin datos suficientes</div>;

                    const maxVal = Math.max(...stats.chartData.map(d => d.value)) || 1;

                    return stats.chartData.map((d, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <div
                                    className="chart-bar"
                                    style={{
                                        width: '80%',
                                        height: `${(d.value / maxVal) * 100}%`,
                                        background: 'linear-gradient(to top, var(--color-primary), #60a5fa)',
                                        borderRadius: '6px 6px 0 0',
                                        transition: 'height 0.5s ease',
                                        position: 'relative',
                                        minHeight: '4px'
                                    }}
                                    title={`S/ ${d.value.toFixed(2)}`}
                                >
                                    <div style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center', fontSize: '0.7rem', color: 'white', fontWeight: 'bold' }}>
                                        {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : Math.round(d.value)}
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.label}</div>
                        </div>
                    ));
                })()}
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
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.7, cursor: 'not-allowed' }}>
                    <CheckCircle size={32} style={{ marginBottom: '0.5rem', color: '#10b981' }} />
                    <div style={{ fontWeight: 'bold' }}>Aprobaciones</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Próximamente</div>
                </div>
            </div>

            {/* Danger Zone */}
            <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '2rem' }}>
                <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    <XCircle size={18} /> Zona de Peligro
                </h3>
                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem', borderColor: 'var(--color-danger)', borderWidth: '1px', borderStyle: 'solid' }}>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Si deseas iniciar desde cero con datos reales, puedes eliminar todos los depósitos de prueba.
                        Esta acción es <strong>irreversible</strong>. Los usuarios NO serán eliminados.
                    </p>
                    <button
                        onClick={async () => {
                            if (window.confirm("🔴 ¿ESTÁS SEGURO?\n\nSe eliminarán TODOS los depósitos del sistema.\nEsta acción no se puede deshacer.")) {
                                if (window.confirm("Confirma por segunda vez: ¿Eliminar todo el historial?")) {
                                    try {
                                        setLoading(true);
                                        await depositService.deleteAllDeposits();
                                        alert("Sistema reiniciado. Todos los depósitos han sido eliminados.");
                                        window.location.reload();
                                    } catch (e) {
                                        alert("Error al eliminar: " + e.message);
                                        setLoading(false);
                                    }
                                }
                            }
                        }}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                    >
                        🗑️ Eliminar Historial Completo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
