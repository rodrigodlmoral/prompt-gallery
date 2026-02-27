const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
(async () => {
    const e = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const p = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(e, p);

    // Check a top holder's fields
    const topUsers = await pb.collection('users').getList(1, 3, {
        sort: '-tokens',
        fields: 'id,username,name,email,tokens'
    });
    console.log('=== TOP USERS (all fields) ===');
    topUsers.items.forEach(u => console.log(JSON.stringify({ id: u.id, username: u.username, name: u.name, email: u.email, tokens: u.tokens })));

    // Check PURCHASE entries structure
    const purchases = await pb.collection('ledger').getList(1, 5, {
        filter: 'type = "PURCHASE"',
        sort: '-created',
        fields: 'from_user,to_user,amount,type,entry_type,tx_hash,created'
    });
    console.log('\n=== PURCHASE ENTRIES ===');
    purchases.items.forEach(e => console.log(JSON.stringify(e)));
    console.log('Total PURCHASE entries:', purchases.totalItems);

    // Check all entry_type values
    const all = await pb.collection('ledger').getFullList({ fields: 'entry_type,type' });
    const stats = {};
    all.forEach(e => {
        const key = `${e.type}|${e.entry_type || 'LEGACY'}`;
        stats[key] = (stats[key] || 0) + 1;
    });
    console.log('\n=== TYPE x ENTRY_TYPE breakdown ===');
    Object.entries(stats).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
})();
