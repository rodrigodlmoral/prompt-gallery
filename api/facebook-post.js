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

        const VERSION = "v4.8.0-CAROUSEL";
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
            `👤 Autor: ${authorDisplay}\n` +
            `🛠️ Herramienta: ${prompt.tool}\n` +
            `📸 Requiere Referencia: ${prompt.needs_reference ? 'SÍ ✅' : 'NO ❌'}\n\n` +
            `💡 PROMPT:\n${prompt.prompt}\n\n` +
            (prompt.negative_prompt ? `🚫 NEGATIVE PROMPT:\n${prompt.negative_prompt}\n\n` : '') +
            `Encuentra más prompts como este en:\n` +
            `|| WWW. PROMPT-GALLERY . APP ||\n\n` +
            `#PromptGallery #AI #AIArt #Prompts`;

        // Instagram caption (prompt completo incluido)
        const igCaption = `✨ ${prompt.title}\n\n` +
            `👤 Por ${authorDisplay}\n` +
            `🛠️ ${prompt.tool}\n` +
            `📸 Requiere Referencia: ${prompt.needs_reference ? 'SÍ ✅' : 'NO ❌'}\n\n` +
            `💡 PROMPT:\n${prompt.prompt}\n\n` +
            (prompt.negative_prompt ? `🚫 NEGATIVE PROMPT:\n${prompt.negative_prompt}\n\n` : '') +
            `🌐 www.prompt-gallery.app\n\n` +
            `#PromptGallery #AI #AIArt #Prompts #AIGenerated #DigitalArt #CreativeAI`;

        // 5. Preparar imágenes (soporta single + multi-image)
        const isSequence = prompt.type === 'sequence' && prompt.content && prompt.content.length > 1;
        let allImages = [];

        if (isSequence) {
            // Multi-image: extract all valid image URLs from sequence (Prefer HD)
            allImages = prompt.content
                .map(item => (item.image_hd && item.image_hd.startsWith('http')) ? item.image_hd : item.image)
                .filter(url => url && url.startsWith('http'));
            console.log(`[FB_SYNC] Sequence detected: ${allImages.length} images`);
        } else {
            // Single image (standard or sequence with 1 image)
            // PRIORIDAD HD: Si existe image_hd, usarla para redes sociales
            let targetImg = (prompt.image_hd && prompt.image_hd.startsWith('http')) ? prompt.image_hd : prompt.image;

            if (prompt.type === 'sequence' && prompt.content && prompt.content.length > 0) {
                const firstItem = prompt.content[0];
                targetImg = (firstItem.image_hd && firstItem.image_hd.startsWith('http')) ? firstItem.image_hd : firstItem.image;
            }
            if (targetImg && targetImg.startsWith('http')) {
                allImages = [targetImg];
            }
        }

        if (allImages.length === 0) {
            console.error('[FB_SYNC] Error: No valid image URLs found.');
            return res.status(400).json({ error: 'No valid public image URLs found' });
        }

        // --- APLICAR MARCA DE AGUA (Cloudinary Only) --- Con q_100 para NO re-comprimir
        const applyWatermark = (url) => {
            if (url.includes('cloudinary.com') && url.includes('/upload/')) {
                const watermarkTransform = 'q_100,l_text:Arial_45_bold:PROMPT-GALLERY.APP,co_white,g_south,y_30/';
                return url.replace('/upload/', `/upload/${watermarkTransform}`);
            }
            return url;
        };

        const fbImages = allImages.map(applyWatermark);
        const igImages = [...allImages]; // IG uses originals (no text watermark)

        // ============================================
        // 6. PUBLICAR EN FACEBOOK
        // ============================================
        let fbPostId = null;
        let fbResponse = null;

        if (fbImages.length === 1) {
            // --- SINGLE IMAGE POST (original logic) ---
            fbResponse = await postToFacebook(PAGE_ID, ACCESS_TOKEN, fbImages[0], fbMessage);
            console.log(`[FB_SYNC] FB Single-Image response: ${fbResponse.id ? 'Success' : 'Error'}`);

            if (fbResponse.error) {
                console.error('[FB_SYNC] Facebook Graph API REJECTED:', JSON.stringify(fbResponse.error));
                return res.status(400).json({
                    error: 'Facebook API rejected the post',
                    details: fbResponse.error.message,
                    fb_code: fbResponse.error.code,
                    fb_subcode: fbResponse.error.error_subcode
                });
            }
            fbPostId = fbResponse.id || fbResponse.post_id;

        } else {
            // --- MULTI-IMAGE ALBUM POST ---
            console.log(`[FB_SYNC] Starting multi-image album upload (${fbImages.length} photos)...`);
            const mediaIds = [];

            for (let i = 0; i < fbImages.length; i++) {
                const imgUrl = fbImages[i];
                console.log(`[FB_SYNC] Uploading photo ${i + 1}/${fbImages.length}...`);

                const params = new URLSearchParams();
                params.set('url', imgUrl);
                params.set('published', 'false'); // Upload but don't publish individually
                params.set('access_token', ACCESS_TOKEN);

                try {
                    const photoRes = await fetch(
                        `https://graph.facebook.com/v24.0/${PAGE_ID}/photos`,
                        { method: 'POST', body: params }
                    );
                    const photoData = await photoRes.json();

                    if (photoData.error) {
                        console.error(`[FB_SYNC] Photo ${i + 1} upload FAILED:`, JSON.stringify(photoData.error));
                        continue; // Skip failed photos, try the rest
                    }
                    mediaIds.push(photoData.id);
                    console.log(`[FB_SYNC] Photo ${i + 1} uploaded: ${photoData.id}`);
                } catch (photoErr) {
                    console.error(`[FB_SYNC] Photo ${i + 1} network error:`, photoErr.message);
                }
            }

            if (mediaIds.length === 0) {
                console.error('[FB_SYNC] All photo uploads failed.');
                return res.status(400).json({ error: 'All Facebook photo uploads failed' });
            }

            // Create the multi-photo feed post
            const feedParams = new URLSearchParams();
            feedParams.set('message', fbMessage);
            feedParams.set('access_token', ACCESS_TOKEN);
            mediaIds.forEach((id, i) => {
                feedParams.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
            });

            try {
                const feedRes = await fetch(
                    `https://graph.facebook.com/v24.0/${PAGE_ID}/feed`,
                    { method: 'POST', body: feedParams }
                );
                fbResponse = await feedRes.json();

                if (fbResponse.error) {
                    console.error('[FB_SYNC] Multi-photo feed post FAILED:', JSON.stringify(fbResponse.error));
                    return res.status(400).json({
                        error: 'Facebook multi-photo post failed',
                        details: fbResponse.error.message
                    });
                }
                fbPostId = fbResponse.id;
                console.log(`[FB_SYNC] FB ALBUM SUCCESS! Post ID: ${fbPostId} (${mediaIds.length} photos)`);
            } catch (feedErr) {
                console.error('[FB_SYNC] Feed post network error:', feedErr.message);
                return res.status(500).json({ error: 'Network error creating multi-photo post' });
            }
        }

        console.log(`[FB_SYNC] FB SUCCESS! Post ID: ${fbPostId}`);

        // ============================================
        // 7. PUBLICAR EN INSTAGRAM (Aislado)
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

                if (igImages.length === 1) {
                    // --- SINGLE IMAGE IG POST ---
                    const containerParams = new URLSearchParams();
                    containerParams.set('image_url', igImages[0]);
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

                        await new Promise(resolve => setTimeout(resolve, 3000));

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

                } else {
                    // --- MULTI-IMAGE IG CAROUSEL ---
                    console.log(`[IG_SYNC] Starting CAROUSEL upload (${igImages.length} items)...`);
                    const childIds = [];

                    // Step 7b: Create individual item containers (no caption on children)
                    for (let i = 0; i < igImages.length; i++) {
                        const itemParams = new URLSearchParams();
                        itemParams.set('image_url', igImages[i]);
                        itemParams.set('is_carousel_item', 'true');
                        itemParams.set('access_token', ACCESS_TOKEN);

                        try {
                            const itemRes = await fetch(
                                `https://graph.facebook.com/v24.0/${igUserId}/media`,
                                { method: 'POST', body: itemParams }
                            );
                            const itemData = await itemRes.json();

                            if (itemData.error) {
                                console.error(`[IG_SYNC] Carousel item ${i + 1} FAILED:`, JSON.stringify(itemData.error));
                                continue;
                            }
                            childIds.push(itemData.id);
                            console.log(`[IG_SYNC] Carousel item ${i + 1} created: ${itemData.id}`);
                        } catch (itemErr) {
                            console.error(`[IG_SYNC] Carousel item ${i + 1} network error:`, itemErr.message);
                        }

                        // Small delay between uploads to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    if (childIds.length < 2) {
                        console.error(`[IG_SYNC] Not enough carousel items created (${childIds.length}). Need >= 2.`);
                        igResult.error = `Only ${childIds.length} items uploaded. IG carousel needs at least 2.`;
                    } else {
                        // Step 7c: Create the carousel container
                        const carouselParams = new URLSearchParams();
                        carouselParams.set('media_type', 'CAROUSEL');
                        carouselParams.set('caption', igCaption);
                        carouselParams.set('access_token', ACCESS_TOKEN);
                        childIds.forEach(id => {
                            carouselParams.append('children', id);
                        });

                        const carouselRes = await fetch(
                            `https://graph.facebook.com/v24.0/${igUserId}/media`,
                            { method: 'POST', body: carouselParams }
                        );
                        const carouselData = await carouselRes.json();

                        if (carouselData.error) {
                            console.error('[IG_SYNC] Carousel container FAILED:', JSON.stringify(carouselData.error));
                            igResult.error = carouselData.error.message;
                        } else {
                            const carouselId = carouselData.id;
                            console.log(`[IG_SYNC] Carousel container created: ${carouselId}. Waiting for processing...`);

                            // Step 7d: Wait for processing (carousels take longer)
                            await new Promise(resolve => setTimeout(resolve, 5000));

                            // Step 7e: Publish the carousel
                            const publishParams = new URLSearchParams();
                            publishParams.set('creation_id', carouselId);
                            publishParams.set('access_token', ACCESS_TOKEN);

                            const publishRes = await fetch(
                                `https://graph.facebook.com/v24.0/${igUserId}/media_publish`,
                                { method: 'POST', body: publishParams }
                            );
                            const publishData = await publishRes.json();

                            if (publishData.error) {
                                console.error('[IG_SYNC] Carousel publish FAILED:', JSON.stringify(publishData.error));
                                igResult.error = publishData.error.message;
                            } else {
                                igResult.success = true;
                                igResult.id = publishData.id;
                                igResult.type = 'carousel';
                                igResult.itemCount = childIds.length;
                                console.log(`[IG_SYNC] CAROUSEL SUCCESS! IG Post ID: ${publishData.id} (${childIds.length} images)`);
                            }
                        }
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
            message: isSequence ? `Album posted (${allImages.length} images)` : 'Posted successfully',
            id: fbPostId,
            type: isSequence ? 'album' : 'single',
            imageCount: allImages.length,
            instagram: igResult
        });

    } catch (error) {
        console.error('[FB_SYNC] CRITICAL SERVER ERROR:', error.message);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

// --- IG ACCOUNT DETECTION ENDPOINT (GET) ---
// Used by admin UI to show IG connection status
export async function detectInstagram(pageId, accessToken) {
    try {
        const res = await fetch(
            `https://graph.facebook.com/v24.0/${pageId}?fields=instagram_business_account{id,username,profile_picture_url,name}&access_token=${accessToken}`
        );
        const data = await res.json();
        if (data.instagram_business_account) {
            return data.instagram_business_account;
        }
        return null;
    } catch (e) {
        console.warn('[IG_DETECT] Error:', e.message);
        return null;
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
