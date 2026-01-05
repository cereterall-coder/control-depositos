import emailjs from '@emailjs/browser';

/**
 * Service to handle email notifications using EmailJS.
 * Requires the following environment variables:
 * - VITE_EMAILJS_SERVICE_ID
 * - VITE_EMAILJS_TEMPLATE_ID
 * - VITE_EMAILJS_PUBLIC_KEY
 */
export const notificationService = {
    /**
     * Sends a deposit alert email to the recipient.
     * @param {Object} params - The email parameters.
     * @param {string} params.to_email - Recipient's email.
     * @param {string} params.to_name - Recipient's name.
     * @param {string} params.from_name - Sender's name.
     * @param {string} params.amount - Deposit amount.
     * @param {string} params.date - Deposit date.
     * @param {string} params.link - App link.
     */
    sendDepositAlert: async ({ to_email, to_name, from_name, amount, date, link }) => {
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (!serviceId || !templateId || !publicKey) {
            console.warn("EmailJS keys are missing. Email notification skipped.");
            return { success: false, error: "Faltan las claves de EmailJS en la configuración (.env)" };
        }

        try {
            const response = await emailjs.send(
                serviceId,
                templateId,
                {
                    to_email,
                    to_name: to_name || to_email,
                    from_name,
                    amount,
                    date,
                    app_link: link,
                    message: `Se ha registrado un depósito de S/. ${amount} el día ${date}.`
                },
                publicKey
            );
            return { success: true, response };
        } catch (error) {
            console.error("EmailJS Error:", error);
            return { success: false, error: error.text || "Error al enviar el correo" };
        }
    }
};
