const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

// The list of users that SHOULD keep the bonus
const targetUsernames = [
    'StarkMontalvan', 'Marchello', 'Zayllon', 'Drnelson',
    'Phablo', 'Tlaloc', 'DarkDjinn', 'jets',
    'Demetrix316', 'Merol', 'AntonioRomero04'
].map(u => u.toLowerCase().replace('@', ''));

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('[PURGE] Admin authenticated');

    // 1. Get all ledger entries created by the backfill
    // They have description including "(backfill)"
    const entries = await pb.collection('ledger').getFullList({
        filter: 'description ~ "(backfill)"',
        expand: 'to_user',
        $autoCancel: false
    });

    console.log(`[PURGE] Found ${entries.length} backfill entries in Ledger.`);

    let purged = 0;
    let kept = 0;

    for (const entry of entries) {
        const user = entry.expand?.to_user;
        if (!user) {
            console.log(`[PURGE] No user expanded for entry ${entry.id}. Deleting for safety.`);
            await pb.collection('ledger').delete(entry.id);
            purged++;
            continue;
        }

        const username = (user.username || user.name || '').toLowerCase().replace('@', '');

        if (targetUsernames.includes(username)) {
            console.log(`[PURGE] ✅ KEEPING bonus for @${user.username} (ID: ${user.id})`);
            kept++;
        } else {
            // console.log(`[PURGE] 🗑️ PURGING bonus for @${user.username} (ID: ${user.id})`);
            await pb.collection('ledger').delete(entry.id);
            purged++;
        }

        if (purged % 50 === 0) {
            process.stdout.write(`\r[PURGE] Progress: ${purged} purged, ${kept} kept`);
        }
    }

    console.log(`\n[PURGE] DONE!`);
    console.log(`[PURGE] Total Purged: ${purged}`);
    console.log(`[PURGE] Total Kept: ${kept}`);
}

main().catch(console.error);
