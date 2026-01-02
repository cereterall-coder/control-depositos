import { supabase } from '../lib/supabase';

// Real implementation using Supabase
export const depositService = {
    // Get deposits sent by me OR received by me
    getDeposits: async (userEmail, userId) => {
        const { data, error } = await supabase
            .from('deposits')
            .select('*')
            .or(`sender_id.eq.${userId},recipient_email.eq.${userEmail}`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    addDeposit: async ({ amount, date, voucherFile, recipientEmail, senderId }) => {
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
                amount,
                deposit_date: date,
                recipient_email: recipientEmail,
                sender_id: senderId,
                voucher_url: voucherUrl,
                status: 'sent'
            }])
            .select();

        if (error) throw error;
        return data[0];
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
    }
};
