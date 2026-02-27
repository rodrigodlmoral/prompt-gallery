const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    try {
        const collections = await pb.collections.getFullList();
        const names = collections.map(c => c.name);
        console.log("All collections:", names.join(', '));

        const hasBoosts = names.includes('boosts');
        const hasNotifications = names.includes('boost_notifications');
        console.log("- boosts collection exists:", hasBoosts);
        console.log("- boost_notifications exists:", hasNotifications);
    } catch (e) {
        console.error("Error from PB:", e.message);
    }
}

main().catch(console.error);
