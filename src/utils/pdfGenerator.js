import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { depositService } from '../services/depositService';

export const generateDepositReport = async ({ deposits, startDate, endDate, includeImages, user, totalAmount, engineerCredits }) => {
    const doc = new jsPDF();

    // 1. Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Reporte de Depósitos", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado por: ${user.email} (${user.user_metadata?.full_name || 'Usuario'})`, 14, 30);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 35);

    if (startDate && endDate) {
        doc.text(`Período: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, 40);
    }

    // 2. Filter Data (Redundant if already filtered, but good for safety)
    // Assuming 'deposits' passed are already the ones to show, but we can double check dates if needed.
    // We'll trust the passed 'deposits' array is what the user wants to print.

    // 3. Prepare Table Data
    const tableColumn = ["Fecha", "Destinatario", "Monto (S/.)", "Estado", "Nota"];
    const tableRows = [];

    for (const dep of deposits) {
        const depositDate = new Date(dep.deposit_date).toLocaleDateString();
        const recipient = dep.recipient_email; // Could map to name if passed
        const amount = `S/. ${parseFloat(dep.amount).toFixed(2)}`;
        const status = dep.status === 'read' ? 'Leído' : 'Enviado';
        const note = dep.note || '-';

        const rowData = [depositDate, recipient, amount, status, note];
        tableRows.push(rowData);
    }

    // 4. Generate Table
    autoTable(doc, {
        startY: 45,
        head: [tableColumn],
        body: tableRows,
        foot: [[
            { content: 'TOTAL:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `S/. ${totalAmount}`, styles: { fontStyle: 'bold' } }, // Total uses passed totalAmount
            '', ''
        ]],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        footStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // 5. Append Images (Vouchers) if requested
    // This is tricky because we need to handle pagination and fetching.
    if (includeImages) {
        let yPos = doc.lastAutoTable.finalY + 10;
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.text("Anexo: Comprobantes (Vouchers)", 14, yPos);
        yPos += 10;

        for (const dep of deposits) {
            if (dep.voucher_url) {
                try {
                    // Check if space needed
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.setFontSize(10);
                    doc.text(`Depósito del ${new Date(dep.deposit_date).toLocaleDateString()} - S/. ${dep.amount}`, 14, yPos);
                    yPos += 5;

                    // Fetch Image
                    // We need a public URL or signed URL. 
                    // Since we are inside the app, we can use depositService to get a signed URL, then fetch it.
                    const signedUrl = await depositService.getVoucherUrl(dep.voucher_url);
                    if (signedUrl) {
                        // Fetch blob
                        const response = await fetch(signedUrl);
                        const blob = await response.blob();
                        const base64 = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });

                        // Add to PDF
                        const imgProps = doc.getImageProperties(base64);
                        const pdfWidth = 100; // Fixed width
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                        doc.addImage(base64, 'JPEG', 14, yPos, pdfWidth, pdfHeight);
                        yPos += pdfHeight + 10;
                    }
                } catch (err) {
                    console.error("Error loading image for PDF", err);
                    doc.text("[Error al cargar imagen]", 14, yPos);
                    yPos += 10;
                }
            }
        }
    }

    // 6. Footer Credits directly in PDF
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(engineerCredits, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    // 7. Save
    doc.save(`Reporte_Depositos_${new Date().toISOString().split('T')[0]}.pdf`);
};
