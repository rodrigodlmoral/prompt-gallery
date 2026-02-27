/**
 * Backfill Admin Gift Ledger Entries
 * 
 * Finds users whose stored token balance exceeds their ledger-derived balance
 * and creates GIFT (CREDIT) entries for the difference.
 * This closes the remaining discrepancy from pre-ledger admin gifts.
 *
 * Safe: Only CREATES new ledger entries. Does NOT modify user balances.
 * Run: node backfill_admin_gifts.cjs
 */
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const BANK_USER_ID = 'z44ierjl0thcczd';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('✅ Admin authenticated\n');

    // 1. Fetch all users
    const allUsers = await pb.collection('users').getFullList({
        fields: 'id,username,tokens,total_earned',
        $autoCancel: false
    });
    const realUsers = allUsers.filter(u => u.id !== BANK_USER_ID);
    console.log(`📊 ${realUsers.length} users loaded`);

    // 2. Fetch ALL ledger entries
    const allLedger = await pb.collection('ledger').getFullList({
        fields: 'amount,entry_type,from_user,to_user',
        $autoCancel: false
    });
    console.log(`📒 ${allLedger.length} ledger entries loaded\n`);

    // 3. Build ledger-derived balance per user
    const ledgerBalance = {};
    for (const rec of allLedger) {
        const amount = rec.amount || 0;
        if (rec.entry_type === 'DEBIT' && rec.from_user) {
            ledgerBalance[rec.from_user] = (ledgerBalance[rec.from_user] || 0) - amount;
        }
        if (rec.entry_type === 'CREDIT' && rec.to_user) {
            ledgerBalance[rec.to_user] = (ledgerBalance[rec.to_user] || 0) + amount;
        }
        // Legacy entries (no entry_type)
        if (!rec.entry_type) {
            if (rec.from_user) ledgerBalance[rec.from_user] = (ledgerBalance[rec.from_user] || 0) - amount;
            if (rec.to_user) ledgerBalance[rec.to_user] = (ledgerBalance[rec.to_user] || 0) + amount;
        }
    }

    // 4. Find discrepancies (stored > ledger = unrecorded income = admin gift)
    const toBackfill = [];
    for (const user of realUsers) {
        const stored = user.tokens || 0;
        const fromLedger = ledgerBalance[user.id] || 0;
        const diff = stored - fromLedger;

        if (diff > 0) {
            toBackfill.push({ id: user.id, username: user.username, stored, fromLedger, diff });
        } else if (diff < 0) {
            // User has FEWER tokens than ledger — this means unrecorded spending
            // We skip these (they could be purchases/boosts that were pre-ledger)
            console.log(`  ℹ️  ${user.username || user.id}: stored=${stored}, ledger=${fromLedger}, diff=${diff} (unrecorded spend — skipping)`);
        }
    }

    console.log(`\n🎁 ${toBackfill.length} users need GIFT backfill entries:`);
    let totalGiftAmount = 0;
    toBackfill.forEach(u => {
        totalGiftAmount += u.diff;
        console.log(`  ${u.username || u.id}: stored=${u.stored}, ledger=${u.fromLedger}, gap=+${u.diff}💎`);
    });
    console.log(`  Total gap: +${totalGiftAmount}💎\n`);

    if (toBackfill.length === 0) {
        console.log('✅ No discrepancies — ledger is fully reconciled!');
        return;
    }

    // 5. Create GIFT entries for each discrepancy
    let success = 0, failed = 0;
    for (const user of toBackfill) {
        try {
            const ts = Date.now().toString(36).toUpperCase();
            const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();

            await pb.collection('ledger').create({
                from_user: BANK_USER_ID,
                to_user: user.id,
                amount: user.diff,
                type: 'GIFT',
                description: `Regalo Admin pre-ledger para @${user.username || 'Usuario'} (backfill reconciliation)`,
                tx_hash: `GIFT-BF-${ts}-${rnd}`,
                entry_type: 'CREDIT'
            });
            success++;
            console.log(`  ✅ ${user.username}: +${user.diff}💎 GIFT entry created`);
        } catch (err) {
            failed++;
            console.error(`  ❌ ${user.username}: ${err.message}`);
            console.error('     Data:', JSON.stringify(err.data, null, 2));
        }
    }

    console.log(`\n=============================`);
    console.log(`✅ Done! ${success} GIFT entries created, ${failed} failed`);
    console.log(`   Total amount backfilled: ${totalGiftAmount}💎`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
