// Usamos el fetch nativo de Node.js (Vercel Node 18+)
// Eliminamos la dependencia externa node-fetch para evitar errores de compilación

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
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, adminSecret } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt data' });
        }

        // 2. Extraer credenciales desde variables de entorno de Vercel
        const PAGE_ID = process.env.FB_PAGE_ID;
        const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

        if (!PAGE_ID || !ACCESS_TOKEN) {
            console.error('[FB_SYNC] Missing FB credentials in environment variables.');
            return res.status(500).json({ error: 'System not configured for Facebook Auto-Post' });
        }

        // 3. Filtrado de Seguridad (SFW y Sugestivo solamente)
        const allowedRatings = ['SFW / Apto', 'Sugestivo'];
        if (!allowedRatings.includes(prompt.rating)) {
            console.log(`[FB_SYCN] Aborting: Rating "${prompt.rating}" is not allowed.`);
            return res.status(200).json({ success: true, message: 'Rating ignored for safety reasons' });
        }

        // 4. Preparar mensaje
        const message = `✨ ¡Nuevo Prompt en Prompt Gallery! ✨\n\n` +
            `📝 Título: ${prompt.title}\n` +
            `👤 Autor: @${prompt.author_name}\n` +
            `🛠️ Herramienta: ${prompt.tool}\n` +
            `📸 Requiere Referencia: ${prompt.needs_reference ? 'SÍ ✅' : 'NO ❌'}\n\n` +
            `💡 PROMPT:\n${prompt.prompt}\n\n` +
            (prompt.negative_prompt ? `🚫 NEGATIVE PROMPT:\n${prompt.negative_prompt}\n\n` : '') +
            `🔗 Ver más en: https://prompt-gallery-v2.vercel.app/post/${prompt.id}\n\n` +
            `#PromptGallery #AI #AIArt #Prompts`;

        // 5. Publicar en Facebook (Solo la imagen principal o primera de secuencia)
        let fbResponse;
        if (prompt.type === 'sequence' && prompt.content && prompt.content.length > 0) {
            const firstImageUrl = prompt.content[0].image;
            fbResponse = await postToFacebook(PAGE_ID, ACCESS_TOKEN, firstImageUrl, message);
        } else {
            fbResponse = await postToFacebook(PAGE_ID, ACCESS_TOKEN, prompt.image, message);
        }

        if (fbResponse.error) {
            console.error('[FB_SYNC] Facebook Graph API Error:', fbResponse.error);
            return res.status(502).json({
                error: 'Facebook API rejected the post',
                details: fbResponse.error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Posted successfully',
            id: fbResponse.id
        });

    } catch (error) {
        console.error('[FB_SYNC] Critical Error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

async function postToFacebook(pageId, token, imageUrl, message) {
    const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;

    // Usamos URLSearchParams para enviar como form-data (estándar de Graph API)
    const params = new URLSearchParams();
    params.append('url', imageUrl);
    params.append('caption', message);
    params.append('access_token', token);

    return fetch(url, {
        method: 'POST',
        body: params
    });
}
