import { supabase } from '../lib/supabase';

// Real implementation using Supabase
export const depositService = {
    // Get deposits sent by me OR received by me
    getDeposits: async (userEmail, userId) => {
        const { data: deposits, error } = await supabase
            .from('deposits')
            // Select computed columns: sender_email AND sender_name
            .select('*, sender_email:sender_email(deposits), sender_name:sender_name(deposits), sender_phone:sender_phone(deposits)')
            .or(`sender_id.eq.${userId},recipient_email.eq.${userEmail}`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return deposits;
    },

    addDeposit: async ({ amount, date, voucherFile, recipientEmail, senderId, observation }) => {
        try {
            let voucherUrl = null;

            if (voucherFile) {
                const fileExt = voucherFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${senderId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('vouchers')
                    .upload(filePath, voucherFile);

                if (uploadError) throw uploadError;
                voucherUrl = filePath;
            }

            const { data, error } = await supabase
                .from('deposits')
                .insert([{
                    amount: amount,
                    deposit_date: date,
                    recipient_email: recipientEmail,
                    sender_id: senderId,
                    voucher_url: voucherUrl,
                    status: 'sent',
                    observation: observation
                }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error("Error adding deposit:", error);
            throw error;
        }
    },

    markAsRead: async (depositId) => {
        const { error } = await supabase
            .from('deposits')
            .update({ status: 'read', read_at: new Date().toISOString() })
            .eq('id', depositId);

        if (error) throw error;
    },

    getVoucherUrl: async (path) => {
        if (!path) return null;
        const { data } = await supabase.storage.from('vouchers').createSignedUrl(path, 3600); // 1 hour link
        return data?.signedUrl;
    },

    // --- Contacts / Favorites Features ---
    getContacts: async (userId) => {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .order('contact_name', { ascending: true });

        if (error) throw error;
        return data;
    },

    addContact: async (userId, email, name = '') => {
        // Check duplicate first to avoid error UI
        const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', userId)
            .eq('contact_email', email)
            .single();

        if (existing) return existing;

        const { data, error } = await supabase
            .from('contacts')
            .insert([{ user_id: userId, contact_email: email, contact_name: name || email }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Admin Features ---
    getAllProfiles: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    updateProfileRole: async (profileId, newRole) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', profileId);

        if (error) throw error;
    },

    updateProfileStatus: async (profileId, newStatus) => {
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', profileId);

        if (error) throw error;
    },

    triggerPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/update-password', // We need a page for this eventually, or just login
        });
        if (error) throw error;
    },

    deleteProfile: async (profileId) => {
        // Note: This only deletes the profile record, NOT the auth user (requires Service Key).
        // However, removing profile might lock them out of some app logic if we rely on it.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profileId);

        if (error) throw error;
    }
};
