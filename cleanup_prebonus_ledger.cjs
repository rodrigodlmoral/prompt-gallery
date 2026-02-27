/**
 * Clean Up Registration Bonuses (Pre-Bonus Users)
 * 
 * Deletes REGISTRATION_BONUS ledger entries for users who currently have 0 tokens.
 * This reconciles the ledger for users who registered before the bonus system was implemented.
 */
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    console.log(`[CLEANUP] Connecting to ${PB_URL}...`);
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('[CLEANUP] ✅ Admin authenticated');

    // 1. Get all users with 0 tokens
    console.log('[CLEANUP] Fetching users with 0 tokens...');
    const usersAtZero = await pb.collection('users').getFullList({
        filter: 'tokens = 0',
        fields: 'id,username',
        $autoCancel: false
    });
    const zeroUserIds = new Set(usersAtZero.map(u => u.id));
    console.log(`[CLEANUP] Found ${usersAtZero.length} users with 0 balance.`);

    // 2. Find REGISTRATION_BONUS entries for these users
    // Only target the ones I just created (tx_hash starts with REGB-)
    console.log('[CLEANUP] Identifying ledger entries to remove...');
    const entries = await pb.collection('ledger').getFullList({
        filter: 'type = "REGISTRATION_BONUS" && tx_hash ~ "REGB-"',
        fields: 'id,to_user,amount',
        $autoCancel: false
    });

    const toDelete = entries.filter(e => zeroUserIds.has(e.to_user));
    console.log(`[CLEANUP] Found ${toDelete.length} entries for pre-bonus users to delete.`);

    if (toDelete.length === 0) {
        console.log('[CLEANUP] ✅ Nothing to delete!');
        return;
    }

    // 3. Delete them
    let success = 0, failed = 0;
    for (const entry of toDelete) {
        try {
            await pb.collection('ledger').delete(entry.id);
            success++;
            process.stdout.write(`\r[CLEANUP] Progress: ${success}/${toDelete.length}`);
        } catch (err) {
            failed++;
            console.error(`\n[CLEANUP] ❌ Failed to delete ${entry.id}: ${err.message}`);
        }
    }

    console.log(`\n[CLEANUP] =============================`);
    console.log(`[CLEANUP] ✅ Done! ${success} entries removed.`);
    console.log(`[CLEANUP] Discrepancy reduction: -${success * 50}💎`);
}

main().catch(err => {
    console.error('[CLEANUP] Fatal:', err);
    process.exit(1);
});
