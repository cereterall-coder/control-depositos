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
            // Create a promise that rejects after 2 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
            );

            const fetchProfile = supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

            // Race the fetch against the timeout
            const { data: profile } = await Promise.race([fetchProfile, timeoutPromise]);

            if (profile) {
                console.log("Profile loaded for:", authUser.email);
                return {
                    ...authUser,
                    role: profile.role,
                    profile_name: profile.full_name,
                    status: profile.status || 'active',
                    subscription_status: profile.subscription_status,
                    trial_end_date: profile.trial_end_date
                };
            }
        } catch (e) {
            console.error("Profile Fetch Error/Timeout:", e);
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
                // If we already have a user, do NOT show loading screen for background refreshes
                // or random events like SIGNED_IN if we are already seeing data.
                // We only block UI if we are transitioning from 'no user' to 'user' potentially.
                const isSilentRefresh = _event === 'TOKEN_REFRESHED' || (_event === 'SIGNED_IN' && user);

                // Also, if 'user' state is already populated with the SAME ID, we can skip blocking UI.
                // But we still want to fetch fresh profile data in background.
                const shouldBlockUI = !user && !isSilentRefresh;

                if (shouldBlockUI) setLoading(true);

                const fullUser = await enrichUser(session.user);

                // Only update state if data actually changed to avoid re-renders (simple check)
                setUser(prev => {
                    // If JSON stringify matches, return prev
                    if (JSON.stringify(prev) === JSON.stringify(fullUser)) return prev;
                    return fullUser;
                });

                if (shouldBlockUI) setLoading(false);
            } else {
                // If session is gone, we must clear user.
                if (user) {
                    setUser(null);
                }
                setLoading(false);
            }
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

    // --- AUTO-LOGOUT LOGIC ---
    useEffect(() => {
        if (!user) return;

        // 5 minutes in milliseconds
        const INACTIVITY_LIMIT = 5 * 60 * 1000;
        let logoutTimer;

        const handleLogout = () => {
            logout();
            // We use a simple alert or toast. Since toast might not persist after logout redirect/state change,
            // we'll try to use toast here but it depends on where Toaster is placed.
            // Assuming Toaster is top-level in App, it should work.
            // Using a native alert might be too intrusive, but safe.
            // Let's rely on standard toast.
            import('react-hot-toast').then(({ toast }) => {
                toast.error("Sesión cerrada por inactividad (5 min)", { duration: 5000 });
            });
        };

        const resetTimer = () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            logoutTimer = setTimeout(handleLogout, INACTIVITY_LIMIT);
        };

        // Events to track activity
        const events = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Optimize mousemove to not fire too often (simple throttle)
        let isThrottled = false;
        const handleActivity = (e) => {
            if (e.type === 'mousemove') {
                if (isThrottled) return;
                isThrottled = true;
                setTimeout(() => { isThrottled = false; }, 1000); // Only reset timer every 1 sec on mousemove
            }
            resetTimer();
        };

        // Attach listeners
        events.forEach(event => window.addEventListener(event, handleActivity));

        // Start initial timer
        resetTimer();

        // Cleanup
        return () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [user]);

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
