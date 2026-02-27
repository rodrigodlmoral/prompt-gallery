/**
 * Local Backfill Script — Registration Bonus Ledger Entries
 * Run: node backfill_registration_bonus_local.cjs
 */
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const BANK_USER_ID = 'z44ierjl0thcczd';
const BONUS = 50;

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    if (!email || !pass) {
        console.error('Missing PB_ADMIN_EMAIL or PB_ADMIN_PASS in .env');
        process.exit(1);
    }

    console.log(`[BACKFILL] Connecting to ${PB_URL}...`);
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('[BACKFILL] ✅ Admin authenticated');

    // 1. Get all users
    const allUsers = await pb.collection('users').getFullList({
        fields: 'id,username,created',
        $autoCancel: false
    });
    const realUsers = allUsers.filter(u => u.id !== BANK_USER_ID);
    console.log(`[BACKFILL] Found ${realUsers.length} users (excluding bank)`);

    // 2. Get existing REGISTRATION_BONUS entries
    const existing = await pb.collection('ledger').getFullList({
        filter: 'type = "REGISTRATION_BONUS"',
        fields: 'to_user',
        $autoCancel: false
    });
    const usersWithBonus = new Set(existing.map(e => e.to_user));
    console.log(`[BACKFILL] ${usersWithBonus.size} users already have REGISTRATION_BONUS`);

    // 3. Find missing users
    const missing = realUsers.filter(u => !usersWithBonus.has(u.id));
    console.log(`[BACKFILL] ${missing.length} users MISSING registration bonus entry`);

    if (missing.length === 0) {
        console.log('[BACKFILL] ✅ Nothing to do — all users accounted for!');
        return;
    }

    // 4. Create entries — first try a test with full error details
    let success = 0, failed = 0;

    // Test with first user to get error details
    const testUser = missing[0];
    console.log(`\n[BACKFILL] Test create for user ${testUser.id} (${testUser.username})...`);
    try {
        const testData = {
            from_user: BANK_USER_ID,
            to_user: testUser.id,
            amount: BONUS,
            type: 'REGISTRATION_BONUS',
            description: `Bono de bienvenida para @${testUser.username || 'Usuario'} (backfill)`,
            tx_hash: `REGB-TEST-${Date.now()}`,
            entry_type: 'CREDIT'
        };
        console.log('[BACKFILL] Payload:', JSON.stringify(testData, null, 2));
        const result = await pb.collection('ledger').create(testData);
        console.log('[BACKFILL] ✅ Test create succeeded! Record ID:', result.id);
        success++;
    } catch (err) {
        console.error('[BACKFILL] ❌ Test create failed:');
        console.error('  Status:', err.status);
        console.error('  Message:', err.message);
        console.error('  Data:', JSON.stringify(err.data, null, 2));
        console.error('  Response:', JSON.stringify(err.response, null, 2));
        console.log('\n[BACKFILL] Aborting — fix the schema issue first.');
        return;
    }

    // Continue with remaining users
    for (let i = 1; i < missing.length; i++) {
        const user = missing[i];
        try {
            const ts = Date.now().toString(36).toUpperCase();
            const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
            const txHash = `REGB-${ts}-${rnd}`;

            await pb.collection('ledger').create({
                from_user: BANK_USER_ID,
                to_user: user.id,
                amount: BONUS,
                type: 'REGISTRATION_BONUS',
                description: `Bono de bienvenida para @${user.username || 'Usuario'} (backfill)`,
                tx_hash: txHash,
                entry_type: 'CREDIT'
            });
            success++;
            process.stdout.write(`\r[BACKFILL] Progress: ${success}/${missing.length}`);
        } catch (err) {
            failed++;
            if (failed <= 3) {
                console.error(`\n[BACKFILL] ❌ Failed for ${user.username}: ${err.message}`);
                console.error('  Data:', JSON.stringify(err.data, null, 2));
            }
        }
    }

    console.log(`\n[BACKFILL] =============================`);
    console.log(`[BACKFILL] ✅ Done! ${success} backfilled, ${failed} failed`);
    console.log(`[BACKFILL] Total users: ${realUsers.length}`);
    console.log(`[BACKFILL] Already had bonus: ${usersWithBonus.size}`);
    console.log(`[BACKFILL] Newly added: ${success}`);
}

main().catch(err => {
    console.error('[BACKFILL] Fatal:', err);
    process.exit(1);
});
