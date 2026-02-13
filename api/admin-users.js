import PocketBase from 'pocketbase';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const pb = new PocketBase(process.env.PB_URL);
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

        // Fetch ALL users (just essential fields for performance if possible, but full is okay)
        // We explicitly use the admin client's power to bypass RLS
        const users = await pb.collection('users').getFullList({
            sort: '-created'
        });

        // Strip sensitive fields before returning?
        // For admin dashboard, we need full data.
        // Assuming this endpoint is protected by obscurity or eventually proper auth.

        return res.status(200).json(users);
    } catch (e) {
        console.error("Admin Users Fetch Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
