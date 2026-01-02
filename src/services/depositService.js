import { supabase } from '../lib/supabase';

// Real implementation using Supabase
export const depositService = {
    // Get deposits sent by me OR received by me
    getDeposits: async (userEmail, userId) => {
        // In a dual-role app (Same app for both), we ideally fetch relevant rows.
        // For simplicity: Fetch rows where sender_id is ME OR recipient_email is ME.
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

        // 1. Upload File
        if (voucherFile) {
            const fileExt = voucherFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${senderId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('vouchers')
                .upload(filePath, voucherFile);

            if (uploadError) throw uploadError;

            // Get public URL (Assuming bucket is public for simplicity, or we use signed urls)
            // I set bucket to private in SQL? Let's use signed URL or make bucket public.
            // For "Vouchers", private is better. We use createSignedUrl when viewing.
            // But for ease of demo, we often make public.
            // Let's assume we use the path to store, and generate keys on read.
            voucherUrl = filePath; // Store the path
        }

        // 2. Insert Record
        const { data, error } = await supabase
            .from('deposits')
            .insert([
                {
                    amount,
                    deposit_date: date,
                    recipient_email: recipientEmail,
                    sender_id: senderId,
                    voucher_url: voucherUrl,
                    status: 'sent'
                }
            ])
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
    }
};
