import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured) {
    console.error('CRITICAL: Supabase URL or Key is missing. The app will not function correctly.');
}

// Prevent crash if keys are missing/undefined. Return a mock object so UI can render an error message.
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        isMock: true,
        auth: {
            getSession: () => Promise.resolve({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: () => Promise.reject(new Error("Supabase no está configurado. Revisa tu archivo .env.local")),
            signUp: () => Promise.reject(new Error("Supabase no está configurado")),
            signOut: () => Promise.resolve(),
        },
        channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
        removeChannel: () => { },
        from: () => ({ select: () => ({ or: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }) // Prevent crash in fetching
    };
