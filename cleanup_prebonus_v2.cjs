const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    console.log('[CLEANUP V2] Aggressive reconcile for pre-bonus users...');

    // 1. Fetch all users with < 50 tokens
    const poorUsers = await pb.collection('users').getFullList({
        filter: 'tokens < 50',
        fields: 'id,username,tokens',
        $autoCancel: false
    });
    const poorUserIds = new Set(poorUsers.map(u => u.id));
    console.log(`[CLEANUP V2] Found ${poorUsers.length} users with < 50 balance.`);

    // 2. Find REGISTRATION_BONUS entries for these users (from my backfill)
    const entries = await pb.collection('ledger').getFullList({
        filter: 'type = "REGISTRATION_BONUS" && tx_hash ~ "REGB-"',
        fields: 'id,to_user,amount',
        $autoCancel: false
    });

    const toDelete = entries.filter(e => poorUserIds.has(e.to_user));
    console.log(`[CLEANUP V2] Found ${toDelete.length} entries to remove.`);

    if (toDelete.length === 0) {
        console.log('[CLEANUP V2] ✅ No orphaned bonuses found.');
        return;
    }

    // 3. Delete
    let success = 0;
    for (const entry of toDelete) {
        try {
            await pb.collection('ledger').delete(entry.id);
            success++;
            process.stdout.write(`\r[CLEANUP V2] Progress: ${success}/${toDelete.length}`);
        } catch (err) {
            console.error(`\n[CLEANUP V2] ❌ Error ${entry.id}: ${err.message}`);
        }
    }

    console.log(`\n[CLEANUP V2] ✅ Reconciled ${success} entries. (Removed ${success * 50}💎 from Minted)`);
}

main().catch(err => console.error(err));
