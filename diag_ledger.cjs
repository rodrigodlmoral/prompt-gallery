const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
(async () => {
    const e = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const p = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(e, p);

    const first = await pb.collection('ledger').getList(1, 20);
    const types = new Set();
    first.items.forEach(i => types.add(i.type));
    console.log('Types found in first 20:', Array.from(types));

    const samples = await pb.collection('ledger').getList(1, 10, { filter: 'type ~ "REGISTRATION"' });
    console.log('REGISTRATION samples:');
    samples.items.forEach(s => console.log(`ID: ${s.id} | Type: [${s.type}] | Hash: [${s.tx_hash}] | to: ${s.to_user}`));
})();
