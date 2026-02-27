const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    const userIds = ['ivm0x6g4y7j34of', '1m4qm9pyrtno1ig'];
    const BANK_USER_ID = 'z44ierjl0thcczd';
    const BONUS = 50;

    for (const userId of userIds) {
        try {
            const user = await pb.collection('users').getOne(userId);
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
        } catch (e) {
            console.error(`Failed for user ${userId}: ${e.message}`);
        }
    }
    console.log('[CLEANUP] Done.');
}

main().catch(console.error);
