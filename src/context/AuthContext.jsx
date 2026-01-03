import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Initial Session Check
    useEffect(() => {
        if (supabase.isMock) {
            setLoading(false);
            return;
        }

        const initSession = async () => {
            try {
                // Get Session FAST (No DB calls yet)
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    console.log("Session found:", session.user.id);
                    setUser(session.user);
                }
            } catch (e) {
                console.error("Session Init Error:", e);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        // 2. Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log("Auth State Change:", _event);
            if (session?.user) {
                setUser(session.user);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 3. Fetch Profile SEPARATELY (Side Effect)
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            // If we already have the extended data, skip
            if (user.role && user.status) return;

            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile) {
                    console.log("Profile loaded:", profile);
                    setUser(prev => ({
                        ...prev,
                        role: profile.role,
                        profile_name: profile.full_name,
                        status: profile.status || 'active'
                    }));
                }
            } catch (e) {
                console.error("Profile Load Error:", e);
            }
        };

        fetchProfile();
    }, [user?.id]); // Run when user ID changes

    const signIn = async (email, password) => {
        if (supabase.isMock) throw new Error("Supabase no configurado");
        // Remove custom timeout wrapper, rely on Supabase
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password, fullName, alias, phone) => {
        if (supabase.isMock) throw new Error("Supabase no configurado");

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    alias: alias,
                    phone: phone,
                    role: 'Miembro'
                }
            }
        });

        if (error) throw error;
        return data;
    };

    const logout = async () => {
        if (supabase.isMock) return;
        await supabase.auth.signOut();
        setUser(null);
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: '#10b981', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p>Iniciando Sistema...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, signIn, signUp, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
