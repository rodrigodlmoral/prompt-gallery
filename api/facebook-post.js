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
            console.error('[FB_SYNC] Error: No prompt data in request body');
            return res.status(400).json({ error: 'Missing prompt data' });
        }

        console.log(`[FB_SYNC] Debug Recibido: "${prompt.title}" | Rating: "${prompt.rating}" | ID: ${prompt.id}`);

        // 2. Extraer credenciales desde variables de entorno de Vercel
        const PAGE_ID = process.env.FB_PAGE_ID;
        const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

        if (!PAGE_ID || !ACCESS_TOKEN) {
            console.error('[FB_SYNC] Missing FB credentials in environment variables.');
            return res.status(500).json({ error: 'System not configured for Facebook Auto-Post' });
        }

        // 3. Filtrado de Seguridad (SFW y Sugestivo solamente)
        const allowedRatings = ['SFW / Apto', 'Sugestivo'];

        // Normalización básica
        const currentRating = (prompt.rating || '').trim();

        if (!allowedRatings.includes(currentRating)) {
            console.log(`[FB_SYNC] Aborting: Rating "${currentRating}" is not allowed.`);
            return res.status(200).json({
                success: true,
                message: 'Rating ignored for safety reasons',
                debugRating: currentRating
            });
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

        // 5. Publicar en Facebook
        let fbResponse;
        let targetImg = prompt.image;

        if (prompt.type === 'sequence' && prompt.content && prompt.content.length > 0) {
            targetImg = prompt.content[0].image;
        }

        console.log(`[FB_SYNC] Enviando a Facebook URL: ${targetImg}`);
        fbResponse = await postToFacebook(PAGE_ID, ACCESS_TOKEN, targetImg, message);

        console.log('[FB_SYNC] Graph API Response:', JSON.stringify(fbResponse));

        if (fbResponse.error) {
            console.error('[FB_SYNC] Facebook Graph API Error Detail:', fbResponse.error);
            // Cambiamos 502 por 400 para que Vercel no lo intercepte como un error del servidor
            return res.status(400).json({
                error: 'Facebook API rejected the post',
                details: fbResponse.error.message,
                fb_code: fbResponse.error.code
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Posted successfully',
            id: fbResponse.id || fbResponse.post_id
        });

    } catch (error) {
        console.error('[FB_SYNC] Critical Error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

async function postToFacebook(pageId, token, imageUrl, message) {
    const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;

    const params = new URLSearchParams();
    params.append('url', imageUrl);
    params.append('caption', message);
    params.append('access_token', token);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: params
        });

        const data = await response.json();
        return data; // Contiene { id, post_id } o { error }
    } catch (e) {
        return { error: { message: e.message } };
    }
}
