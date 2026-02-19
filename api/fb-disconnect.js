export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { settingsId } = req.body;
        if (!settingsId) return res.status(400).json({ error: 'Missing settingsId' });

        const { default: PocketBase } = await import('pocketbase');
        const pbUrl = process.env.PB_URL || process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
        const pb = new PocketBase(pbUrl);

        try {
            await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
        } catch {
            await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
        }

        await pb.collection('fb_settings').delete(settingsId);

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[FB_DISCONNECT] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
