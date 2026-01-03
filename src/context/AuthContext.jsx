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

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email, password) => {
        if (supabase.isMock) throw new Error("Supabase no configurado");
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
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
                    role: 'Miembro' // Default role
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        if (supabase.isMock) return;
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, signIn, signUp, logout, loading }}>
            {!loading && children}
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
