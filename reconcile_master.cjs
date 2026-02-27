const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const e = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const p = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(e, p);

    console.log('[RECONCILE MASTER] Auditing all Registration Bonuses...');

    // 1. Get all users
    const users = await pb.collection('users').getFullList({ fields: 'id,tokens,username' });
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    // 2. Get all REGISTRATION_BONUS entries
    const entries = await pb.collection('ledger').getFullList({
        filter: 'type = "REGISTRATION_BONUS"',
        fields: 'id,to_user,amount,tx_hash'
    });

    console.log(`Analyzing ${entries.length} entries against ${users.length} users...`);

    let toDelete = [];
    entries.forEach(entry => {
        const user = userMap[entry.to_user];
        if (!user) return; // User doesn't exist anymore? Keep for safety or delete? Let's keep.

        // If user has LESS than the bonus amount (50), and it's a backfill entry (tx_hash REGB-)
        // then the ledger is lieing about giving them 50.
        if (user.tokens < 50 && entry.tx_hash && entry.tx_hash.startsWith('REGB-')) {
            toDelete.push({ id: entry.id, username: user.username, balance: user.tokens });
        }
    });

    console.log(`Identified ${toDelete.length} orphaned bonuses to "desaparecer".`);

    if (toDelete.length === 0) {
        console.log('✅ All clean!');
        return;
    }

    // 3. Delete
    let count = 0;
    for (const item of toDelete) {
        try {
            await pb.collection('ledger').delete(item.id);
            count++;
            if (count % 10 === 0) process.stdout.write(`\rDeleted: ${count}/${toDelete.length}`);
        } catch (err) {
            console.error(`\nFailed ${item.id}: ${err.message}`);
        }
    }

    console.log(`\n✅ Finished. Deleted ${count} false bonuses.`);
}

main().catch(err => console.error(err));
