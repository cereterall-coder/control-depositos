import { useState } from 'react';
import { supabase } from '../lib/supabase';

const SimpleLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('Idle');
    const [result, setResult] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setStatus('Connecting...');
        setResult('');

        try {
            const start = Date.now();
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            const end = Date.now();

            if (error) {
                setStatus('Error');
                setResult(JSON.stringify(error, null, 2));
            } else {
                setStatus(`Success! (${end - start}ms)`);
                setResult(JSON.stringify(data, null, 2));
                // Try to set cookie manually or just show success
                console.log("Login Data:", data);
            }
        } catch (err) {
            setStatus('Exception');
            setResult(err.message);
        }
    };

    return (
        <div style={{ padding: '2rem', background: '#000', color: '#0f0', minHeight: '100vh', fontFamily: 'monospace' }}>
            <h1>LOGIN DE EMERGENCIA 🚑</h1>
            <p>Prueba de conexión directa sin interfaz gráfica.</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ padding: '10px' }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ padding: '10px' }}
                />
                <button type="submit" style={{ padding: '10px', background: '#0f0', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    INTENTAR ENTRAR
                </button>
            </form>

            <div style={{ marginTop: '2rem' }}>
                <h3>Estado: {status}</h3>
                <pre style={{ background: '#111', padding: '1rem', whiteSpace: 'pre-wrap', border: '1px solid #333' }}>
                    {result}
                </pre>
            </div>

            {status.includes('Success') && (
                <a href="/" style={{ color: 'white', display: 'block', marginTop: '1rem' }}>➡️ Ir al Dashboard (Si dice Success)</a>
            )}
        </div>
    );
};

export default SimpleLogin;
