import PocketBase from 'pocketbase';

/**
 * api/fb-save-page.js
 * 
 * 1. Receives Page ID, Name, and Page Access Token
 * 2. Validates token by calling /me endpoint of the page
 * 3. Authenticates as Admin to PocketBase
 * 4. Saves/Updates the single 'active' record in 'fb_settings'
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { pageId, pageName, pageAccessToken, userId } = req.body;

        if (!pageId || !pageAccessToken) {
            return res.status(400).json({ error: 'Missing page details' });
        }

        // 1. Validate Token with FB
        console.log(`[FB_SAVE] Validating token for Page ${pageName} (${pageId})...`);
        const debugUrl = `https://graph.facebook.com/me?access_token=${pageAccessToken}`;
        const debugRes = await fetch(debugUrl);
        const debugData = await debugRes.json();

        if (debugData.error || debugData.id !== pageId) {
            console.error('[FB_SAVE] Token invalid or mismatch:', debugData);
            return res.status(400).json({ error: 'Invalid Page Token', details: debugData.error?.message });
        }

        // 2. Connect to PocketBase as Admin
        const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
        const email = process.env.PB_ADMIN_EMAIL;
        const pass = process.env.PB_ADMIN_PASS;

        if (!email || !pass) {
            return res.status(500).json({ error: 'Server misconfiguration (PB Admin)' });
        }

        await pb.admins.authWithPassword(email, pass);

        // 3. Check for existing active settings
        // We only want ONE active page connection at a time for simplicity
        const existing = await pb.collection('fb_settings').getList(1, 1, {
            filter: 'status="active"',
            sort: '-created'
        });

        // 4. Save new setting
        // Expiry calculation: Long-lived tokens last ~60 days. We set it to 59 days just to be safe.
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 59);

        const recordData = {
            page_id: pageId,
            page_name: pageName,
            access_token: pageAccessToken,
            status: 'active',
            connected_by: userId || null,
            expires_at: expiresAt.toISOString(),
            debug_info: {
                connected_at: new Date().toISOString(),
                fb_id: debugData.id
            }
        };

        let savedRecord;

        if (existing.items.length > 0) {
            // Update existing (or archive old one and create new? Let's update to keep history clean for now)
            // Actually, better to archive old ones to keep history? 
            // The schema has 'status'. Let's mark old ones as 'expired' and create a new one.
            const oldId = existing.items[0].id;
            await pb.collection('fb_settings').update(oldId, { status: 'expired' });

            savedRecord = await pb.collection('fb_settings').create(recordData);
            console.log(`[FB_SAVE] Expired old settings (${oldId}) and created new one.`);
        } else {
            savedRecord = await pb.collection('fb_settings').create(recordData);
            console.log('[FB_SAVE] Created new settings record.');
        }

        return res.status(200).json({ success: true, id: savedRecord.id });

    } catch (error) {
        console.error('[FB_SAVE] Error:', error);
        // Concatenate message to 'error' so frontend alert shows it without code changes needed there
        return res.status(500).json({ error: 'Save Error: ' + error.message, message: error.message });
    }
}
