import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Clock, Smartphone, FileText } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

            {/* HERO SECTION */}
            <header style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                padding: '4rem 1rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px', margin: '0 auto' }}>
                    <div className="font-signature" style={{ fontSize: '2.5rem', color: '#60a5fa', marginBottom: '1rem' }}>Control Depósitos</div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1.5rem', lineHeight: '1.2', color: 'white' }}>
                        Del caos al control <br />
                        <span style={{ color: '#60a5fa' }}>en un solo clic.</span>
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: '#cbd5e1', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                        Olvídate de guardar tus comprobantes en cualquier lado.<br />
                        Organízalos, asegura tu información y genera reportes al instante.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-primary"
                            style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '50px' }}
                        >
                            Empezar Ahora <ArrowRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Abstract Background Decoration */}
                <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '500px', height: '500px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '400px', height: '400px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
            </header>

            {/* PROBLEM vs SOLUTION */}
            <section style={{ padding: '4rem 1rem', background: 'var(--bg-surface)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '3rem', fontWeight: 'bold' }}>¿Te suena familiar?</h2>

                    <div className="dashboard-grid" style={{ alignItems: 'center', gap: '4rem' }}>
                        {/* The Pain */}
                        <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-15px', left: '20px', background: '#ef4444', color: 'white', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>ANTES</div>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                                    <span style={{ color: '#ef4444' }}>✕</span> ¿Dónde dejé el voucher del lunes?
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                                    <span style={{ color: '#ef4444' }}>✕</span> Fotos perdidas en el chat de WhatsApp.
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                                    <span style={{ color: '#ef4444' }}>✕</span> Cuadrar caja a fin de mes es eterno.
                                </li>
                            </ul>
                        </div>

                        {/* The Solution */}
                        <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(34, 197, 94, 0.2)', background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.05), transparent)', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-15px', left: '20px', background: '#22c55e', color: 'white', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>AHORA</div>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: '500' }}>
                                    <CheckCircle size={20} color="#22c55e" /> Todo centralizado en la nube.
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: '500' }}>
                                    <CheckCircle size={20} color="#22c55e" /> Búsqueda inteligente al instante.
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: '500' }}>
                                    <CheckCircle size={20} color="#22c55e" /> Reportes PDF en un solo clic.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section style={{ padding: '4rem 1rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '3rem', fontWeight: 'bold' }}>Todo lo que necesitas</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        <FeatureCard
                            icon={<Smartphone size={32} color="#60a5fa" />}
                            title="Accesible Siempre"
                            desc="Úsalo desde tu celular o computadora. Tu información viaja contigo."
                        />
                        <FeatureCard
                            icon={<Shield size={32} color="#60a5fa" />}
                            title="Seguridad Total"
                            desc="Tus datos están encriptados y protegidos con las mejores prácticas."
                        />
                        <FeatureCard
                            icon={<FileText size={32} color="#60a5fa" />}
                            title="Reportes PDF"
                            desc="Genera balances y comprobantes profesionales listos para imprimir."
                        />
                        <FeatureCard
                            icon={<Clock size={32} color="#60a5fa" />}
                            title="Ahorra Tiempo"
                            desc="Deja de perder horas buscando papeles. Encuentra cualquier depósito en segundos."
                        />
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ background: '#0f172a', padding: '3rem 1rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="font-signature" style={{ fontSize: '2rem', color: 'white' }}>Amalviva</div>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>Soluciones digitales que simplifican tu vida.</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <a href="#" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Contacto</a>
                    <a href="#" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Soporte</a>
                    <a href="/login" style={{ color: '#60a5fa', fontWeight: 'bold', textDecoration: 'none' }}>Ingresar al Sistema</a>
                </div>

                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    © {new Date().getFullYear()} Control Depósitos. Desarrollado por Amalviva.
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: 'fit-content', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{desc}</p>
    </div>
);

export default LandingPage;
