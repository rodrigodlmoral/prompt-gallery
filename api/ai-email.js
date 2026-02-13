import { OpenAI } from 'openai';

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

    const { prompt, imageUrl } = req.body;

    if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'Server misconfigured: OPENROUTER_API_KEY missing' });
    }

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });

        const systemPrompt = `
You are the Lead HTML Email Engineer for "Prompt Gallery".
Your mission is to generate a professional, pixel-perfect, and responsive HTML email.

**Context about Prompt Gallery:**
- It is a premium community for AI Art (Midjourney, Stable Diffusion, DALL-E).
- Users share prompts, earn "PromptBits" (💎), and level up.
- The brand identity is Dark, Mysterious, and Premium.

**Design Rules (EXTREMLY STRICT):**
1. **Colors:**
   - Background: #000000 (Black)
   - Accent: #ffd700 (Gold)
   - Secondary Text: #888888 (Gray)
   - Main Text: #ffffff (White)
2. **Layout:**
   - Max-width: 600px, centered.
   - Use table-based layout for maximum email client compatibility.
3. **CSS Reset:** Include a style block with: body { margin:0; padding:0; background-color:#000000; color:#ffffff; font-family: Arial, sans-serif; }
4. **Hero Image:**
   - ${imageUrl ? `Use this specific image: <img src="${imageUrl}" style="width:100%; height:auto; display:block; border-bottom: 2px solid #ffd700;">` : 'Use a high-quality placeholder from Unsplash related to "Abstract AI Art" with gold accents.'}
5. **Hallucinations:** 
   - DO NOT invent new features like "Free Subscriptions" or "App Store links" unless mentioned in the prompt.
   - Focus only on the user's specific instruction.
   - Use factually correct info about Prompt Gallery.

**HTML Structure Skeleton:**
<!DOCTYPE html>
<html>
<head>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; }
        @media screen and (max-width: 600px) { .mobile-shell { width: 100% !important; } }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #111111; border: 1px solid #333; border-radius: 8px; overflow: hidden;">
                    <!-- HEADER -->
                    <tr><td align="center" style="padding: 25px; border-bottom: 1px solid #222;"><h1 style="color: #ffd700; margin: 0; font-family: Arial; letter-spacing: 2px;">PROMPT GALLERY</h1></td></tr>
                    <!-- HERO -->
                    <tr><td>[HERO_IMAGE]</td></tr>
                    <!-- CONTENT -->
                    <tr><td style="padding: 40px 30px; line-height: 1.6; font-size: 16px; color: #ccc;">[BODY_TEXT]</td></tr>
                    <!-- CTA -->
                    <tr><td align="center" style="padding-bottom: 40px;"><a href="https://www.prompt-gallery.app" style="background-color: #ffd700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">[CTA_TEXT]</a></td></tr>
                    <!-- FOOTER -->
                    <tr><td align="center" style="padding: 20px; background-color: #0a0a0a; color: #555; font-size: 12px;">© 2024 Prompt Gallery. All rights reserved.</td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

**Instruction:**
Generate the email by filling the skeleton based on the user's prompt: "${prompt}".
Avoid using white backgrounds anywhere. Ensure the result is professional.
Return ONLY the HTML code.
`;

        const userContent = [
            { type: "text", text: `Generate an email for: "${prompt}"` }
        ];

        if (imageUrl) {
            userContent.push({
                type: "image_url",
                image_url: { url: imageUrl }
            });
        }

        const completion = await openai.chat.completions.create({
            model: "openrouter/free", // Best available free model handled by OpenRouter
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
            ],
        });

        let generatedHtml = completion.choices[0].message.content;

        // Cleanup if the AI still adds markdown
        generatedHtml = generatedHtml.replace(/```html/g, '').replace(/```/g, '').trim();

        return res.status(200).json({ success: true, html: generatedHtml });

    } catch (error) {
        console.error('AI Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate email' });
    }
}
