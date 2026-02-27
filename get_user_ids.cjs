const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const usernames = [
    'StarkMontalvan', 'Marchello', 'Zayllon', 'Drnelson',
    'Phablo', 'Tlaloc', 'DarkDjinn', 'jets',
    'Demetrix316', 'Merol', 'AntonioRomero04'
];

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('[IDs] Admin authenticated');

    const result = [];
    for (const u of usernames) {
        try {
            const res = await pb.collection('users').getFirstListItem(`username="${u}" || name="${u}"`);
            result.push({ username: u, id: res.id });
        } catch (e) {
            console.log(`[IDs] ⚠️ Not found: ${u}`);
        }
    }

    console.log('[IDs] FOUND USERS:');
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
