const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const formData = body.formData || {};
        const signatureBase64 = body.signatureBase64;

        // 1. Create PDF
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { height } = page.getSize();

        // Header
        page.drawText('ROBIN RADAR SYSTEMS - SUPPLIER FORM', {
            x: 50,
            y: height - 50,
            size: 16,
            font: fontBold,
            color: rgb(0.05, 0.07, 0.09)
        });

        let yPos = height - 90;
        const addLine = (label, value) => {
            page.drawText(`${label}:`, { x: 50, y: yPos, size: 10, font: fontBold });
            page.drawText(`${value || 'N/A'}`, { x: 200, y: yPos, size: 10, font });
            yPos -= 22;
        };

        // General fields
        addLine('Company Name', formData.companyName);
        addLine('Address', formData.address);
        addLine('Zip / City', formData.zipCity);
        addLine('Country', formData.country);
        addLine('Phone', formData.phone);
        addLine('Finance Email', formData.email);
        addLine('Website', formData.website);

        // US vs Non-US
        if (formData.country === 'United States') {
            addLine('TIN / FEIN', formData.tinFein);
            addLine('Bank Name', formData.usBankName);
            addLine('Bank Address', formData.usBankAddress);
            addLine('ACH Routing #', formData.achRouting);
            addLine('Account #', formData.accountNumber);
            addLine('BIC', formData.usBic);
            addLine('FW/ABA', formData.fwAba);
        } else {
            addLine('VAT Number', formData.vatNumber);
            addLine('KvK Number', formData.kvkNumber);
            addLine('IBAN', formData.iban);
            addLine('BIC', formData.bic);
            addLine('SWIFT', formData.swift);
        }

        addLine('Payment Terms', formData.paymentTerms);
        addLine('Authorised Signatory', formData.signatoryName);

        // Embed signature image if provided
        if (signatureBase64 && typeof signatureBase64 === 'string' && signatureBase64.includes('base64,')) {
            const rawBase64 = signatureBase64.split('base64,')[1];
            const signatureImageBytes = Buffer.from(rawBase64, 'base64');
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

            yPos -= 10;
            page.drawText('Signature:', { x: 50, y: yPos, size: 10, font: fontBold });
            page.drawImage(signatureImage, {
                x: 200,
                y: yPos - 35,
                width: 140,
                height: 45
            });

            page.drawText(`Digitally signed: ${new Date().toUTCString()}`, {
                x: 200,
                y: yPos - 45,
                size: 8,
                font
            });
        }

        // Save PDF to buffer
        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        // 2. Send email via Resend
        const safeCompanyName = (formData.companyName || 'Supplier').replace(/[^a-zA-Z0-9_-]/g, '_');
        
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['max.grimwood@robinradar.com'],
            subject: `New Supplier Form: ${formData.companyName || 'Vendor Submission'}`,
            text: `A new supplier onboarding form has been completed by ${formData.signatoryName || 'a vendor'}.\n\nPlease find the signed PDF agreement attached.`,
            attachments: [
                {
                    filename: `Supplier_${safeCompanyName}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Submission successful' })
        };
    } catch (error) {
        console.error('Function execution error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message || 'Server error occurred' })
        };
    }
};

// Export for both CommonJS and ES Module resolution
exports.handler = handler;
module.exports = { handler };
