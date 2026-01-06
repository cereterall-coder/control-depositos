import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper to merge Auth User + Profile Data
    const enrichUser = async (authUser) => {
        if (!authUser) return null;
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

            if (profile) {
                console.log("Profile loaded for:", authUser.email);
                return {
                    ...authUser,
                    role: profile.role,
                    profile_name: profile.full_name,
                    status: profile.status || 'active'
                };
            }
        } catch (e) {
            console.error("Profile Fetch Error:", e);
        }
        return authUser;
    };

    // 1. Initial Session Check
    useEffect(() => {
        if (supabase.isMock) {
            setLoading(false);
            return;
        }

        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    const fullUser = await enrichUser(session.user);
                    setUser(fullUser);
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
                // If we already have the user and IDs match, maybe don't re-fetch? 
                // But on LOGIN event we MUST fetch.
                setLoading(true); // Ensure loading is true while fetching profile
                const fullUser = await enrichUser(session.user);
                setUser(fullUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

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
