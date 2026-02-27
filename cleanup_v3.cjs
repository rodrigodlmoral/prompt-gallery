const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const BANK_USER_ID = 'z44ierjl0thcczd';
const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

async function main() {
    const e = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const p = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(e, p);

    console.log('[CLEANUP V3] Starting manual match cleanup...');

    // 1. Fetch all users with < 50 tokens
    const poorUsers = await pb.collection('users').getFullList({
        filter: 'tokens < 50',
        fields: 'id,username,tokens',
        $autoCancel: false
    });
    const poorUserIds = new Set(poorUsers.map(u => u.id));
    console.log(`[CLEANUP V3] Found ${poorUsers.length} users with < 50 tokens.`);

    // 2. Fetch ALL Registration Bonuses
    const entries = await pb.collection('ledger').getFullList({
        filter: 'type = "REGISTRATION_BONUS"',
        fields: 'id,to_user,tx_hash',
        $autoCancel: false
    });
    console.log(`[CLEANUP V3] Found ${entries.length} total bonus entries in ledger.`);

    // 3. Match
    const toDelete = entries.filter(entry => {
        const isBackfill = entry.tx_hash && entry.tx_hash.startsWith('REGB-');
        const isTargetUser = poorUserIds.has(entry.to_user);
        return isBackfill && isTargetUser;
    });

    console.log(`[CLEANUP V3] Identified ${toDelete.length} orphaned entries for deletion.`);

    if (toDelete.length === 0) {
        console.log('[CLEANUP V3] ✅ Nothing to delete.');
        return;
    }

    // 4. Delete
    let success = 0;
    for (const entry of toDelete) {
        try {
            await pb.collection('ledger').delete(entry.id);
            success++;
            if (success % 10 === 0) process.stdout.write(`\r[CLEANUP V3] Deleting: ${success}/${toDelete.length}`);
        } catch (err) {
            console.error(`\n[CLEANUP V3] Error deleting ${entry.id}: ${err.message}`);
        }
    }

    console.log(`\n[CLEANUP V3] ✅ DONE. Removed ${success} entries.`);
}

main().catch(err => console.error(err));
