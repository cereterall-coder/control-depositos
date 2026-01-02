// Simulates a secure backend interaction
// In production, this would communicate with a real API (Node.js/Supabase)

const STORAGE_KEY = 'deposits_data_v1';

// Initial seed data
const SEED_DATA = [
    {
        id: 'dep_001',
        amount: 1500.00,
        date: '2025-12-01T10:00:00',
        status: 'read', // sent, read
        voucherUrl: null, // In a real app, this is a secure bucket URL
        senderId: 'user_sender_001',
        recipientId: 'user_recipient_001',
        note: 'Mensualidad Diciembre'
    }
];

export const mockBackend = {
    getDeposits: async () => {
        await delay(500); // Simulate network latency
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : SEED_DATA;
    },

    addDeposit: async (deposit) => {
        await delay(800);
        const data = localStorage.getItem(STORAGE_KEY);
        const currentList = data ? JSON.parse(data) : SEED_DATA;

        const newDeposit = {
            ...deposit,
            id: `dep_${Date.now()}`,
            status: 'sent',
            timestamp: new Date().toISOString(),
        };

        currentList.unshift(newDeposit);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
        return newDeposit;
    },

    markAsRead: async (depositId) => {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return;

        const currentList = JSON.parse(data);
        const updatedList = currentList.map(d =>
            d.id === depositId ? { ...d, status: 'read', readAt: new Date().toISOString() } : d
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    },

    // Simulating a secure file upload service
    uploadVoucher: async (file) => {
        await delay(1000);
        // In demo, we convert to Base64 to store in localstorage, 
        // BUT we limit size to prevent crashing.
        return new Promise((resolve, reject) => {
            if (file.size > 2 * 1024 * 1024) {
                reject(new Error("File too large for demo storage (Limit: 2MB)"));
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
