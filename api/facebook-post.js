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

        const VERSION = "v4.7.3-DUAL-POST";
        console.log(`[FB_SYNC] Debug Recibido: "${prompt.title}" | Rating: "${prompt.rating}" | ID: ${prompt.id}`);
        console.log(`[FB_SYNC] API Version: ${VERSION} | Time: ${new Date().toISOString()}`);

        // 2. Obtener credenciales (Prioridad: PB > Env Vars)
        let PAGE_ID = (process.env.FB_PAGE_ID || '').trim();
        let ACCESS_TOKEN = (process.env.FB_PAGE_ACCESS_TOKEN || '').trim();
        let source = 'ENV_VAR';

        try {
            const { default: PocketBase } = await import('pocketbase');
            const pbUrl = process.env.PB_URL || process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
            const pb = new PocketBase(pbUrl);

            try {
                await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
            } catch (authErr) {
                console.warn('[FB_SYNC] _superusers auth failed, trying legacy admins...', authErr.message);
                await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
            }

            const settings = await pb.collection('fb_settings').getList(1, 1, {
                filter: 'status="active"',
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

        console.log(`[FB_SYNC] Token Analysis: Length=${ACCESS_TOKEN.length} | Start=${ACCESS_TOKEN.substring(0, 5)}...`);
        console.log(`[FB_SYNC] Page ID: ${PAGE_ID}`);

        // 3. Filtrado de Seguridad (SFW y Sugestivo solamente)
        const allowedRatings = ['SFW / Apto', 'Sugestivo'];
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

        // 4. Preparar mensajes
        const authorDisplay = prompt.author || prompt.author_name || 'Explorador';

        // Facebook caption (con prompt completo)
        const fbMessage = `✨ ¡Nuevo Prompt! ✨\n\n` +
            `📝 Título: ${prompt.title}\n` +
            `👤 Autor: @${authorDisplay}\n` +
            `🛠️ Herramienta: ${prompt.tool}\n` +
            `📸 Requiere Referencia: ${prompt.needs_reference ? 'SÍ ✅' : 'NO ❌'}\n\n` +
            `💡 PROMPT:\n${prompt.prompt}\n\n` +
            (prompt.negative_prompt ? `🚫 NEGATIVE PROMPT:\n${prompt.negative_prompt}\n\n` : '') +
            `Encuentra más prompts como este en:\n` +
            `|| WWW. PROMPT-GALLERY . APP ||\n\n` +
            `#PromptGallery #AI #AIArt #Prompts`;

        // Instagram caption (más corto, sin prompt completo para engagement)
        const igCaption = `✨ ${prompt.title}\n\n` +
            `👤 Por @${authorDisplay}\n` +
            `🛠️ ${prompt.tool}\n\n` +
            `¿Quieres el prompt completo? 👉 Link en bio\n` +
            `🌐 www.prompt-gallery.app\n\n` +
            `#PromptGallery #AI #AIArt #Prompts #AIGenerated #DigitalArt #CreativeAI`;

        // 5. Preparar imagen
        let targetImg = prompt.image;

        if (prompt.type === 'sequence' && prompt.content && prompt.content.length > 0) {
            targetImg = prompt.content[0].image;
        }

        if (!targetImg || !targetImg.startsWith('http')) {
            console.error('[FB_SYNC] Error: URL de imagen inválida o local.');
            return res.status(400).json({ error: 'Valid public image URL required', url: targetImg });
        }

        // --- APLICAR MARCA DE AGUA (Cloudinary Only) ---
        let fbImg = targetImg;
        if (fbImg.includes('cloudinary.com') && fbImg.includes('/upload/')) {
            const watermarkTransform = 'l_text:Arial_45_bold:PROMPT-GALLERY.APP,co_white,g_south,y_30/';
            fbImg = fbImg.replace('/upload/', `/upload/${watermarkTransform}`);
            console.log(`[FB_SYNC] FB Watermark applied: ${fbImg}`);
        }

        // IG usa la imagen original (sin marca de agua de texto, solo visual)
        const igImg = targetImg;

        // ============================================
        // 6. PUBLICAR EN FACEBOOK (Existente - No tocar)
        // ============================================
        const fbResponse = await postToFacebook(PAGE_ID, ACCESS_TOKEN, fbImg, fbMessage);

        console.log(`[FB_SYNC] FB Graph API response: ${fbResponse.id ? 'Success' : 'Error'}`);

        if (fbResponse.error) {
            console.error('[FB_SYNC] Facebook Graph API REJECTED:', JSON.stringify(fbResponse.error));
            return res.status(400).json({
                error: 'Facebook API rejected the post',
                details: fbResponse.error.message,
                fb_code: fbResponse.error.code,
                fb_subcode: fbResponse.error.error_subcode
            });
        }

        const fbPostId = fbResponse.id || fbResponse.post_id;
        console.log(`[FB_SYNC] FB SUCCESS! Post ID: ${fbPostId}`);

        // ============================================
        // 7. PUBLICAR EN INSTAGRAM (Nuevo - Aislado)
        //    Si falla, FB ya fue exitoso y se reporta OK
        // ============================================
        let igResult = { attempted: false };

        try {
            // Step 7a: Detect Instagram Business Account linked to this Page
            const igAccountRes = await fetch(
                `https://graph.facebook.com/v24.0/${PAGE_ID}?fields=instagram_business_account&access_token=${ACCESS_TOKEN}`
            );
            const igAccountData = await igAccountRes.json();

            if (!igAccountData.instagram_business_account?.id) {
                console.log('[IG_SYNC] No Instagram Business Account linked to this Page. Skipping IG post.');
                igResult = { attempted: false, reason: 'No IG account linked' };
            } else {
                const igUserId = igAccountData.instagram_business_account.id;
                console.log(`[IG_SYNC] Found IG Account: ${igUserId}. Starting publish flow...`);
                igResult.attempted = true;

                // Step 7b: Create Media Container
                const containerParams = new URLSearchParams();
                containerParams.set('image_url', igImg);
                containerParams.set('caption', igCaption);
                containerParams.set('access_token', ACCESS_TOKEN);

                const containerRes = await fetch(
                    `https://graph.facebook.com/v24.0/${igUserId}/media`,
                    { method: 'POST', body: containerParams }
                );
                const containerData = await containerRes.json();

                if (containerData.error) {
                    console.error('[IG_SYNC] Container creation FAILED:', JSON.stringify(containerData.error));
                    igResult.error = containerData.error.message;
                } else {
                    const containerId = containerData.id;
                    console.log(`[IG_SYNC] Container created: ${containerId}. Publishing...`);

                    // Step 7c: Wait briefly for container to be ready (IG processing)
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Step 7d: Publish the container
                    const publishParams = new URLSearchParams();
                    publishParams.set('creation_id', containerId);
                    publishParams.set('access_token', ACCESS_TOKEN);

                    const publishRes = await fetch(
                        `https://graph.facebook.com/v24.0/${igUserId}/media_publish`,
                        { method: 'POST', body: publishParams }
                    );
                    const publishData = await publishRes.json();

                    if (publishData.error) {
                        console.error('[IG_SYNC] Publish FAILED:', JSON.stringify(publishData.error));
                        igResult.error = publishData.error.message;
                    } else {
                        igResult.success = true;
                        igResult.id = publishData.id;
                        console.log(`[IG_SYNC] SUCCESS! IG Post ID: ${publishData.id}`);
                    }
                }
            }
        } catch (igErr) {
            console.warn('[IG_SYNC] Instagram post failed (non-critical):', igErr.message);
            igResult.error = igErr.message;
        }

        // 8. Return combined result (FB is always the primary)
        return res.status(200).json({
            success: true,
            message: 'Posted successfully',
            id: fbPostId,
            instagram: igResult
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
