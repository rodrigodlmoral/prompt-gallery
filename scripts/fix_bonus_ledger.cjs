/**
 * FIX: Create missing REGISTRATION_BONUS ledger entries for existing users.
 * 
 * These users received 50💎 in their wallet but the ledger entry was never created.
 * Run: node scripts/fix_bonus_ledger.cjs
 */
const PocketBase = require('pocketbase/cjs');

const PB_URL = 'https://prompt-gallery.pockethost.io';
const PB_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_PASS = process.env.PB_ADMIN_PASS;
const BANK_USER_ID = 'z44ierjl0thcczd';

// Usernames to fix (from screenshot)
const USERS_TO_FIX = ['Rami', 'CoreanoG', 'Koreano98', 'KoreanoGamer98', 'Koreano99'];

async function main() {
    if (!PB_EMAIL || !PB_PASS) {
        console.error('❌ Set PB_ADMIN_EMAIL and PB_ADMIN_PASS environment variables.');
        process.exit(1);
    }

    const pb = new PocketBase(PB_URL);

    try {
        await pb.admins.authWithPassword(PB_EMAIL, PB_PASS);
    } catch {
        await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASS);
    }
    console.log('✅ Authenticated as admin.');

    for (const username of USERS_TO_FIX) {
        try {
            // Find user by username or name
            let user;
            try {
                user = await pb.collection('users').getFirstListItem(`username = "${username}"`);
            } catch {
                try {
                    user = await pb.collection('users').getFirstListItem(`name = "${username}"`);
                } catch {
                    console.warn(`⚠️ User "${username}" not found. Skipping.`);
                    continue;
                }
            }

            // Check if ledger entry already exists
            const existing = await pb.collection('ledger').getList(1, 1, {
                filter: `to_user = "${user.id}" && type = "REGISTRATION_BONUS"`
            });

            if (existing.totalItems > 0) {
                console.log(`⏭️ ${username} (${user.id}) — Already has REGISTRATION_BONUS. Skipping.`);
                continue;
            }

            // Create ledger entry
            const txHash = 'REGB-FIX-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

            await pb.collection('ledger').create({
                from_user: BANK_USER_ID,
                to_user: user.id,
                amount: 50,
                type: 'REGISTRATION_BONUS',
                description: `Bono de bienvenida para @${username} (fix retroactivo)`,
                tx_hash: txHash,
                entry_type: 'CREDIT'
            });

            console.log(`✅ ${username} (${user.id}) — Ledger REGISTRATION_BONUS created. TX: ${txHash}`);
        } catch (err) {
            console.error(`❌ Error processing ${username}:`, err.message);
        }
    }

    console.log('\n🏁 Done. Discrepancies for these users should now be resolved.');
}

main();
