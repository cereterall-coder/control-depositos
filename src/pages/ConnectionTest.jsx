import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ConnectionTest = () => {
    const [status, setStatus] = useState('Testing...');
    const [details, setDetails] = useState('');
    const [envInfo, setEnvInfo] = useState({});

    useEffect(() => {
        runTest();
    }, []);

    const runTest = async () => {
        setStatus('Running diagnostics...');
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        setEnvInfo({
            url: url ? url.substring(0, 15) + '...' : 'MISSING',
            keyLength: key ? key.length : 0
        });

        try {
            // Test 1: Simple Fetch to URL (should be 404 or healthy)
            const t1Start = Date.now();
            setStatus('Pinging Supabase Server...');

            // Supabase Project URL usually responds to root or /rest/v1/
            try {
                // We try a fetch to the health endpoint or similar. 
                // Using auth/v1/health is standard
                const res = await fetch(`${url}/auth/v1/health`);
                const text = await res.text();
                setDetails(prev => prev + `\n[Ping] Status: ${res.status}. Time: ${Date.now() - t1Start}ms`);
            } catch (pingErr) {
                setDetails(prev => prev + `\n[Ping Error] ${pingErr.message}`);
            }

            // Test 2: Supabase Client Query
            setStatus('Querying Database...');
            const t2Start = Date.now();
            const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

            if (error) {
                setDetails(prev => prev + `\n[DB Error] ${error.message} (Code: ${error.code})`);
                throw error;
            }

            setDetails(prev => prev + `\n[DB Success] DB Connection OK. Time: ${Date.now() - t2Start}ms`);
            setStatus('Connection Successful ✅');

        } catch (e) {
            console.error(e);
            setStatus('Connection Failed ❌');
        }
    };

    return (
        <div style={{ padding: '2rem', color: 'white', background: '#111', minHeight: '100vh', fontFamily: 'monospace' }}>
            <h1>Diagnóstico de Red</h1>
            <div style={{ border: '1px solid #333', padding: '1rem', marginTop: '1rem' }}>
                <p><strong>Status:</strong> {status}</p>
                <p><strong>URL Check:</strong> {envInfo.url}</p>
                <button onClick={runTest} style={{ padding: '0.5rem 1rem', cursor: 'pointer', marginTop: '1rem' }}>Re-Run Rest</button>
            </div>
            <pre style={{ background: '#222', padding: '1rem', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
                {details}
            </pre>
        </div>
    );
};

export default ConnectionTest;
