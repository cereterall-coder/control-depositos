import { supabase } from '../lib/supabase';

// Real implementation using Supabase
export const depositService = {
    // Get deposits sent by me OR received by me
    getDeposits: async (userEmail, userId) => {
        const { data: deposits, error } = await supabase
            .from('deposits')
            // Select computed columns: sender_email AND sender_name
            .select('*, sender_email, sender_name, sender_phone')
            .or(`sender_id.eq.${userId},recipient_email.eq.${userEmail}`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return deposits;
    },

    // Admin: Get ALL deposits
    getAllDeposits: async () => {
        const { data: deposits, error } = await supabase
            .from('deposits')
            .select('*, sender_email, sender_name')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return deposits;
    },

    // Renamed to match usage in SenderDashboard
    createDeposit: async ({ amount, deposit_date, file, recipient_email, sender_id, observation }) => {
        try {
            let voucherUrl = null;

            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${sender_id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('vouchers')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
                voucherUrl = filePath;
            }

            const { data, error } = await supabase
                .from('deposits')
                .insert([{
                    amount: amount,
                    deposit_date: deposit_date,
                    recipient_email: recipient_email,
                    sender_id: sender_id,
                    voucher_url: voucherUrl, // Corrected column name back to voucher_url
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

    // Alias for backward compatibility if needed
    addDeposit: async (params) => {
        return depositService.createDeposit(params);
    },

    // New Update Method
    updateDeposit: async (id, updates) => {
        // updates: { amount, deposit_date, observation }
        const { error } = await supabase
            .from('deposits')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    markAsRead: async (depositId) => {
        const { error } = await supabase
            .from('deposits')
            .update({ status: 'read', read_at: new Date().toISOString() })
            .eq('id', depositId);

        if (error) throw error;
    },

    getVoucherUrl: (path) => {
        if (!path) return null;
        const { data } = supabase.storage.from('vouchers').getPublicUrl(path);
        return data.publicUrl;
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
    },

    async deleteDeposit(id) {
        // PERMANENT DELETE (Only for non-soft delete logic if needed, or Admin)
        const { error } = await supabase
            .from('deposits')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async softDeleteDeposit(id) {
        const { error } = await supabase
            .from('deposits')
            .update({ sender_deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    // DANGER: Delete ALL deposits (Admin Reset)
    async deleteAllDeposits() {
        const { error } = await supabase
            .from('deposits')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (UUID safe)
        if (error) throw error;
    },

    async restoreDeposit(id) {
        const { error } = await supabase
            .from('deposits')
            .update({ sender_deleted_at: null })
            .eq('id', id);
        if (error) throw error;
    },
};
