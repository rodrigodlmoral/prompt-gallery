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
You are an expert Email Marketing Copywriter and HTML Developer for "Prompt Gallery", a premium AI Art platform.
Your goal is to generate high-converting, visually stunning HTML emails based on the user's request.

**Design Guidelines (Strict):**
- **Theme:** Dark Mode, Premium, Gold Accents.
- **Background:** #000000 or #111111.
- **Text:** White (#ffffff) or Light Gray (#cccccc).
- **Accents:** Gold (#ffd700).
- **Font:** Arial, sans-serif.
- **Structure:** 
    - Header with "Prompt Gallery" Logo/Text (Gold).
    - Hero Section (Image provided or placeholder).
    - Body Content (Persuasive, engaging).
    - CTA Button (Gold background, Black text, Rounded).
    - Footer (Simple, dark gray).

**Image Handling:**
- If the user provides an \`imageUrl\`, use it as the Hero Image.
- If not, use a relevant high-quality placeholder from Unsplash.

**Output Format:**
- Return ONLY the raw HTML code.
- Do NOT include markdown code blocks (no \`\`\`html).
- Do NOT include explanations.
- The HTML must be fully responsive (width: 100%, max-width: 600px container).
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
            model: "google/gemini-2.0-flash-exp:free", // Using a widely available free model
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
