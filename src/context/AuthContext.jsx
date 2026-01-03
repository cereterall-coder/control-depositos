import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If supabase is mock (error state), stop loading immediately
        if (supabase.isMock) {
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            try {
                let currentUser = session?.user ?? null;
                if (currentUser) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, full_name')
                        .eq('id', currentUser.id)
                        .maybeSingle();

                    if (profile) {
                        currentUser = {
                            ...currentUser,
                            role: profile.role,
                            profile_name: profile.full_name
                        };
                    }
                }
                setUser(currentUser);
            } catch (e) {
                console.error("Session Init Error:", e);
                setUser(session?.user ?? null);
            } finally {
                setLoading(false);
            }
        }).catch(err => {
            console.error("Critical Auth Error:", err);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                let currentUser = session?.user ?? null;
                if (currentUser) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, full_name')
                        .eq('id', currentUser.id)
                        .maybeSingle();

                    if (profile) {
                        currentUser = {
                            ...currentUser,
                            role: profile.role,
                            profile_name: profile.full_name
                        };
                    }
                }
                setUser(currentUser);
            } catch (e) {
                console.error("Auth State Change Error:", e);
                setUser(session?.user ?? null);
            }
        });

        // Safety timeout in case getSession hangs
        const timer = setTimeout(() => {
            console.warn("Auth check timed out, forcing load");
            setLoading(false);
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const withTimeout = (promise, ms = 30000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("El servidor tardó demasiado en responder. Verifica tu conexión.")), ms))
        ]);
    };

    const signIn = async (email, password) => {
        if (supabase.isMock) throw new Error("Supabase no configurado");

        const { data, error } = await withTimeout(
            supabase.auth.signInWithPassword({ email, password })
        );

        if (error) throw error;
        return data;
    };

    const signUp = async (email, password, fullName, alias, phone) => {
        if (supabase.isMock) throw new Error("Supabase no configurado");

        const { data, error } = await withTimeout(
            supabase.auth.signUp({
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
            })
        );

        if (error) throw error;
        return data;
    };

    const logout = async () => {
        if (supabase.isMock) return;
        await supabase.auth.signOut();
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
