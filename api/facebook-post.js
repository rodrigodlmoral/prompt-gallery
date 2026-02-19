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

        const VERSION = "v4.6-OAUTH-CONNECT";
        console.log(`[FB_SYNC] Debug Recibido: "${prompt.title}" | Rating: "${prompt.rating}" | ID: ${prompt.id}`);
        console.log(`[FB_SYNC] API Version: ${VERSION} | Time: ${new Date().toISOString()}`);

        // 2. Obtener credenciales (Prioridad: PB > Env Vars)
        let PAGE_ID = (process.env.FB_PAGE_ID || '').trim();
        let ACCESS_TOKEN = (process.env.FB_PAGE_ACCESS_TOKEN || '').trim();
        let source = 'ENV_VAR';

        try {
            // Intentar leer de PocketBase fb_settings
            const { default: PocketBase } = await import('pocketbase'); // Dynamic import for Vercel
            const pbUrl = process.env.PB_URL || process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
            const pb = new PocketBase(pbUrl);

            // Auth Admin (PB v0.23+ requires _superusers collection)
            try {
                await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
            } catch (authErr) {
                // Fallback for older PB versions or if _superusers doesn't exist yet
                console.warn('[FB_SYNC] _superusers auth failed, trying legacy admins...', authErr.message);
                await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
            }

            const settings = await pb.collection('fb_settings').getList(1, 1, {
                filter: 'status="active"',
                // sort: '-created' // REMOVED: Causes 400 error in PB v0.23+ on this collection
            });

            if (settings.items.length > 0) {
                const rec = settings.items[0];
                PAGE_ID = rec.page_id;
                ACCESS_TOKEN = rec.access_token;
                source = `POCKETBASE (Page: ${rec.page_name})`;
                console.log(`[FB_SYNC] Using credentials from: ${source}`);
            } else {
                console.log('[FB_SYNC] No active fb_settings found in PB. Falling back to ENV.');
            }
        } catch (pbErr) {
            console.warn('[FB_SYNC] PocketBase credentials fetch failed (Using ENV fallback):', pbErr.message);
        }

        if (!PAGE_ID || !ACCESS_TOKEN) {
            console.error('[FB_SYNC] Missing FB credentials everywhere (PB & ENV).');
            return res.status(500).json({ error: 'System not configured for Facebook Auto-Post' });
        }

        // Diagnóstico de formato (debug profundo para "Decryption Error")
        console.log(`[FB_SYNC] Token Analysis: Length=${ACCESS_TOKEN.length} | Start=${ACCESS_TOKEN.substring(0, 5)}... | End=...${ACCESS_TOKEN.substring(ACCESS_TOKEN.length - 5)}`);
        console.log(`[FB_SYNC] Page ID: ${PAGE_ID}`);

        // --- DIAGNÓSTICO DE TOKEN ---
        try {
            const meRes = await fetch(`https://graph.facebook.com/me?access_token=${ACCESS_TOKEN}`);
            const meData = await meRes.json();
            console.log(`[FB_SYNC] Token Identity: ${meData.name || 'Unknown'} (ID: ${meData.id})`);

            if (meData.id !== PAGE_ID) {
                console.warn(`[FB_SYNC] WARNING: Token identity (${meData.id}) does not match PAGE_ID (${PAGE_ID}). You might be using a User Token instead of a Page Token.`);
            }
        } catch (e) {
            console.warn('[FB_SYNC] Could not verify token identity:', e.message);
        }

        // 3. Filtrado de Seguridad (SFW y Sugestivo solamente)
        const allowedRatings = ['SFW / Apto', 'Sugestivo'];

        // Normalización básica
        const currentRating = (prompt.rating || '').trim();

        if (!allowedRatings.includes(currentRating)) {
            console.log(`[FB_SYNC] Aborting: Rating "${currentRating}" is not allowed.`);
            return res.status(200).json({
                success: false,
                skipped: true,
                message: 'Rating ignored for safety reasons',
                debugRating: currentRating
            });
        }

        // 4. Preparar mensaje (Sin enlaces, solo texto espaciado)
        // Usamos prompt.author (mapeado en store-final) en lugar de author_name
        const authorDisplay = prompt.author || prompt.author_name || 'Explorador';
        const message = `✨ ¡Nuevo Prompt! ✨\n\n` +
            `📝 Título: ${prompt.title}\n` +
            `👤 Autor: @${authorDisplay}\n` +
            `🛠️ Herramienta: ${prompt.tool}\n` +
            `📸 Requiere Referencia: ${prompt.needs_reference ? 'SÍ ✅' : 'NO ❌'}\n\n` +
            `💡 PROMPT:\n${prompt.prompt}\n\n` +
            (prompt.negative_prompt ? `🚫 NEGATIVE PROMPT:\n${prompt.negative_prompt}\n\n` : '') +
            `Encuentra más prompts como este en:\n` +
            `|| WWW. PROMPT-GALLERY . APP ||\n\n` +
            `#PromptGallery #AI #AIArt #Prompts`;

        // 5. Publicar en Facebook
        let fbResponse;
        let targetImg = prompt.image;

        if (prompt.type === 'sequence' && prompt.content && prompt.content.length > 0) {
            targetImg = prompt.content[0].image;
        }

        console.log(`[FB_SYNC] Debug Payload: URL=${targetImg}`);

        // Verificación básica de URL para evitar fallos tontos
        if (!targetImg || !targetImg.startsWith('http')) {
            console.error('[FB_SYNC] Error: URL de imagen inválida o local.');
            return res.status(400).json({ error: 'Valid public image URL required', url: targetImg });
        }

        // --- APLICAR MARCA DE AGUA (Cloudinary Only) ---
        // Texto: PROMPT-GALLERY.APP | Fuente: Arial | Tamaño: 45 | Color: Blanco | Posición: Abajo al centro
        if (targetImg.includes('cloudinary.com') && targetImg.includes('/upload/')) {
            // Transformación: overlay texto, gravedad sur, margen Y 30, color blanco
            const watermarkTransform = 'l_text:Arial_45_bold:PROMPT-GALLERY.APP,co_white,g_south,y_30/';
            targetImg = targetImg.replace('/upload/', `/upload/${watermarkTransform}`);
            console.log(`[FB_SYNC] Watermark applied (Text only): ${targetImg}`);
        } else {
            console.log('[FB_SYNC] Skipping watermark (Not a Cloudinary URL or incompatible format)');
        }

        fbResponse = await postToFacebook(PAGE_ID, ACCESS_TOKEN, targetImg, message);

        console.log(`[FB_SYNC] Graph API raw response status: ${fbResponse.id ? 'Success' : 'Error'}`);

        if (fbResponse.error) {
            console.error('[FB_SYNC] Facebook Graph API REJECTED:', JSON.stringify(fbResponse.error));
            return res.status(400).json({
                error: 'Facebook API rejected the post',
                details: fbResponse.error.message,
                fb_code: fbResponse.error.code,
                fb_subcode: fbResponse.error.error_subcode
            });
        }

        const finalId = fbResponse.id || fbResponse.post_id;
        console.log(`[FB_SYNC] SUCCESS! Final ID: ${finalId}`);

        return res.status(200).json({
            success: true,
            message: 'Posted successfully',
            id: finalId
        });

    } catch (error) {
        console.error('[FB_SYNC] CRITICAL SERVER ERROR:', error.message);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

async function postToFacebook(pageId, token, imageUrl, message) {
    const url = `https://graph.facebook.com/v24.0/${pageId}/photos`;

    const params = new URLSearchParams();
    params.set('url', imageUrl);
    params.set('caption', message);
    params.set('access_token', token);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(url, {
            method: 'POST',
            body: params,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();
        return data;
    } catch (e) {
        console.error('[FB_SYNC] Network/Fetch Error:', e.message);
        return { error: { message: `Network or Timeout: ${e.message}`, code: -1 } };
    }
}
