const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
(async () => {
    const e = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const p = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(e, p);

    const u = await pb.collection('users').getFirstListItem('username="Osmy"');
    const entries = await pb.collection('ledger').getFullList({ filter: `to_user="${u.id}"` });
    console.log(`User Osmy (${u.id}) | Balance: ${u.tokens}`);
    console.log(JSON.stringify(entries, null, 2));
})();
