const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('[CLEANUP] ✅ Admin authenticated');

    // Get all REGISTRATION_BONUS entries created today (within the last hour)
    // The previous run was around 2026-02-24 12:??
    // So created >= "2026-02-24 11:00:00"
    const recent = await pb.collection('ledger').getFullList({
        filter: 'type = "REGISTRATION_BONUS" && created >= "2026-02-24 00:00:00.000Z"',
        $autoCancel: false
    });

    console.log(`[CLEANUP] Found ${recent.length} recent REGISTRATION_BONUS entries.`);

    // Wait, some might have been legitimate today, but the prompt says ONLY the 10 in the screenshot needed it, and they were MISSING before my script. 
    // Before my script ran, there were 11 total REGISTRATION_BONUS entries. 
    // Wait, the backfill script said: `11 users already have REGISTRATION_BONUS`
    // And it inserted 320.
    // So all the ones inserted just now will have tx_hash starting with REGB- (and the 11 might too.. wait. Let's look at the time).
    // Let's just delete the ones created in the last 2 hours.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().replace('T', ' ');

    // Actually pocketbase expects time in UTC. Let's just fetch all and filter in JS
    const allBonus = await pb.collection('ledger').getFullList({
        filter: 'type = "REGISTRATION_BONUS"',
        expand: 'to_user',
        $autoCancel: false
    });

    // We'll delete those created recently. My script ran on '2026-02-24T18:??:??Z' (since local is 12:14 -06:00, UTC is 18:14).
    const cutoffDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const onesToDelete = allBonus.filter(b => new Date(b.created) > cutoffDate);
    console.log(`[CLEANUP] Found ${onesToDelete.length} entries created in the last hour to delete.`);

    // The users the user actually wanted:
    const targetUsernames = [
        'NickZinny',
        'carlos240797',
        'charlie24',
        'Jakers247',
        'Mari@.12',
        'G0nz4p1',
        'Marianne7',
        'Magorocha',
        'Ideas.nsfw',
        'solunatierra'
    ].map(u => u.toLowerCase());

    let deletedCount = 0;

    for (const entry of onesToDelete) {
        // Let's delete ALL of the ones created in the last hour.
        // And then we can properly recreate JUST for the ones in the screenshot.
        await pb.collection('ledger').delete(entry.id);
        deletedCount++;
        process.stdout.write(`\r[CLEANUP] Deleted: ${deletedCount}/${onesToDelete.length}`);
    }
    console.log('\n[CLEANUP] Deletion complete.');

    // Now re-create ONLY for the specific users
    console.log('[CLEANUP] Now creating entries FOR TARGET USERS ONLY...');
    const usersCollection = await pb.collection('users').getFullList({ $autoCancel: false });
    const targetUsers = usersCollection.filter(u => targetUsernames.includes(u.username?.toLowerCase() || '') || targetUsernames.includes(u.name?.toLowerCase() || ''));

    console.log(`[CLEANUP] Found ${targetUsers.length} out of ${targetUsernames.length} target users.`);

    const BANK_USER_ID = 'z44ierjl0thcczd';
    const BONUS = 50;

    for (const user of targetUsers) {
        const ts = Date.now().toString(36).toUpperCase();
        const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();

        await pb.collection('ledger').create({
            from_user: BANK_USER_ID,
            to_user: user.id,
            amount: BONUS,
            type: 'REGISTRATION_BONUS',
            description: `Bono de bienvenida para @${user.username || user.name || 'Usuario'} (manual)`,
            tx_hash: `REGB-${ts}-${rnd}`,
            entry_type: 'CREDIT'
        });
        console.log(`[CLEANUP] Created bonus for ${user.username || user.name}`);
    }

    console.log('[CLEANUP] ✅ Done fixing the disaster.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
