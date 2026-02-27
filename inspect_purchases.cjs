const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
(async () => {
    const e = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const p = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(e, p);

    const purchases = await pb.collection('ledger').getList(1, 5, {
        filter: 'type = "PURCHASE"',
        sort: '-created'
    });
    console.log('=== DETAILED PURCHASE ENTRIES ===');
    purchases.items.forEach(item => {
        console.log(`ID: ${item.id}`);
        console.log(`  from_user: ${item.from_user}`);
        console.log(`  to_user:   ${item.to_user}`);
        console.log(`  amount:    ${item.amount}`);
        console.log(`  type:      ${item.type}`);
        console.log(`  entry_tp:  ${item.entry_type || 'NONE'}`);
        console.log('---------------------------');
    });
})();
