const { PDFDocument } = require('pdf-lib');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { formData, signatureBase64 } = JSON.parse(event.body);

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        page.drawText(`Company: ${formData.companyName}`, { x: 50, y: 750, size: 12 });
        
        if (signatureBase64) {
            const signatureImage = await pdfDoc.embedPng(signatureBase64);
            page.drawImage(signatureImage, { x: 50, y: 650, width: 150, height: 50 });
        }
        
        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes).toString('base64');

        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['max.grimwood@robinradar.com'], 
            subject: `New Vendor Onboarding: ${formData.companyName}`,
            text: 'Please find the signed vendor agreement attached.',
            attachments: [{
                filename: `${formData.companyName.replace(/\s+/g, '_')}_Agreement.pdf`,
                content: pdfBuffer,
            }]
        });

        return { statusCode: 200, body: JSON.stringify({ message: "Success" }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};