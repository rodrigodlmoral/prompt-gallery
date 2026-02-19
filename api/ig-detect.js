// API endpoint to detect Instagram Business Account linked to a Facebook Page
// Used by admin UI to show IG connection status

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        // Get page credentials from PocketBase
        const { default: PocketBase } = await import('pocketbase');
        const pbUrl = process.env.PB_URL || process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
        const pb = new PocketBase(pbUrl);

        try {
            await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
        } catch {
            await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
        }

        const settings = await pb.collection('fb_settings').getList(1, 1, {
            filter: 'status="active"',
        });

        if (settings.items.length === 0) {
            return res.status(200).json({ connected: false, reason: 'No active FB page' });
        }

        const { page_id, access_token } = settings.items[0];

        // Query Facebook Graph API for linked IG account
        const igRes = await fetch(
            `https://graph.facebook.com/v24.0/${page_id}?fields=instagram_business_account{id,username,profile_picture_url,name}&access_token=${access_token}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
            const ig = igData.instagram_business_account;
            return res.status(200).json({
                connected: true,
                id: ig.id,
                username: ig.username || null,
                name: ig.name || null,
                profile_picture_url: ig.profile_picture_url || null
            });
        }

        return res.status(200).json({ connected: false, reason: 'No IG account linked to Page' });

    } catch (error) {
        console.error('[IG_DETECT] Error:', error.message);
        return res.status(200).json({ connected: false, reason: error.message });
    }
}
