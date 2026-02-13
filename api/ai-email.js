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
You are the Lead HTML Email Engineer for "PROMPT-GALLERY".
Your mission is to generate a professional, pixel-perfect, and responsive HTML email that matches the brand's unique "Vibrant Blue & Gold" aesthetic.

**Brand Identity (Based on Website Screenshot):**
- **Main Colors:** 
  - Background: #000000 (Pure Black)
  - Primary Accent (Branding/Logo): #2563eb (Royal Blue) or #00aaff (Cyan/Glow)
  - Secondary Accent (Admin/Gold): #ffd700 (Gold)
- **Logo:** The brand name is "PROMPT-GALLERY" usually shown with a Blue Diamond icon.

**Design Rules (EXTREMLY STRICT):**
1. **Header:** 
   - Logo text: <span style="color: #2563eb; font-weight: bold;">PROMPT</span>-<span style="color: #00aaff; font-weight: bold;">GALLERY</span>
   - Add a subtle blue glow effect to text if possible (CSS: text-shadow: 0 0 10px rgba(0, 170, 255, 0.5);)
2. **Buttons:**
   - Use BOTH Blue and Gold strategically.
   - Primary buttons (like "View Prompt"): #2563eb (Blue) background, #ffffff text.
   - Important/Admin notices: Gold background or Gold border.
3. **Typography:** White (#ffffff) for main titles, Light Gray (#cccccc) for body text.
4. **Hallucinations:** 
   - DO NOT invent "Free Subscriptions" or generic features.
   - Mention "PromptBits" (💎) and "Levels" appropriately if the content allows.

**HTML Structure Skeleton:**
<!DOCTYPE html>
<html>
<head>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; }
        @media screen and (max-width: 600px) { .mobile-shell { width: 100% !important; } }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #0b0b0b; border: 1px solid #1a1a1a; border-radius: 12px; overflow: hidden; box-shadow: 0 0 30px rgba(0, 100, 255, 0.1);">
                    <!-- LOGO HEADER -->
                    <tr>
                        <td align="center" style="padding: 30px; border-bottom: 1px solid #111; background-color: #000;">
                           <div style="font-family: Arial; font-size: 24px; letter-spacing: 2px;">
                                <span style="color: #2563eb;">💎 PROMPT</span>-<span style="color: #00aaff;">GALLERY</span>
                           </div>
                        </td>
                    </tr>
                    <!-- HERO -->
                    <tr><td>[HERO_IMAGE]</td></tr>
                    <!-- CONTENT WINDOW -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #00aaff; margin-top: 0; font-family: Arial;">[AI_GENERATED_TITLE]</h2>
                            <div style="line-height: 1.7; font-size: 16px; color: #bbb; font-family: Arial;">[BODY_TEXT]</div>
                        </td>
                    </tr>
                    <!-- CTA -->
                    <tr>
                        <td align="center" style="padding-bottom: 50px;">
                            <a href="https://www.prompt-gallery.app" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: Arial; display: inline-block;">[CTA_TEXT]</a>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td align="center" style="padding: 25px; background-color: #050505; color: #444; font-size: 12px; font-family: Arial; border-top: 1px solid #111;">
                            © 2024 Prompt Gallery • La comunidad premium de Arte AI<br>
                            <a href="#" style="color: #666; text-decoration: none; margin-top: 10px; display: block;">Darse de baja</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

**Instruction:**
Generate the email by filling the [AI_GENERATED_TITLE], [BODY_TEXT], and [CTA_TEXT] tags.
Use the Hero Image as instructed before.
Ensure the layout feels "Nuclear" and "Premium".
Avoid using pure Gold for EVERYTHING; use Blue/Cyan as the primary brand color and Gold only for highlights/buttons that need extra attention.
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
