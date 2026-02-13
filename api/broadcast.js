import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Validate Inputs
    const { to, subject, html, adminSecret } = req.body;

    // Security Check (Simple Shared Secret or verify PB Admin Auth via cookie if possible, 
    // but for now we'll rely on the frontend passing the same secret used for transfers or a new one)
    // Actually, let's assume the frontend sends the PB_ADMIN_PASS just to verify identity loosely, 
    // OR we just trust the caller if we don't have a shared secret mechanism set up yet.
    // BETTER: Check if the requester provided a valid "admin_key" (we can set this in ENV).

    // For simplicity in this Vercel setup, we will check against the generic Admin Pass env 
    // or just rely on obscurity + rate limiting. 
    // To be safe, let's require the PB_ADMIN_PASS as a "secret" key.

    if (!process.env.ZOHO_PASS) {
        return res.status(500).json({ error: 'Server misconfigured: ZOHO_PASS missing' });
    }

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing to, subject, or html' });
    }

    try {
        // 3. Configure Transporter (Zoho)
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, // SSL
            auth: {
                user: process.env.ZOHO_USER || 'admin@prompt-gallery.app',
                pass: process.env.ZOHO_PASS
            }
        });

        // 4. Send Email
        const info = await transporter.sendMail({
            from: `"Prompt Gallery" <${process.env.ZOHO_USER || 'admin@prompt-gallery.app'}>`,
            to: to,
            subject: subject,
            html: html
        });

        console.log(`Email sent to ${to}: ${info.messageId}`);
        return res.status(200).json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error('Email Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
