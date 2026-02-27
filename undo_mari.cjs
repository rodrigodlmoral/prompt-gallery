const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    const users = await pb.collection('users').getFullList({ $autoCancel: false });
    // Look for Mari@.12
    const mari = users.find(u => (u.username || '').toLowerCase().includes('mari@.12') || (u.name || '').toLowerCase().includes('mario') || (u.username || '').toLowerCase().includes('mari@'));
    if (!mari) {
        console.log('User Mari basically not found. Checking exactly:');
        console.log(users.filter(u => u.username?.toLowerCase().includes('mari')).map(u => u.username));
        return;
    }

    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();

    await pb.collection('ledger').create({
        from_user: 'z44ierjl0thcczd',
        to_user: mari.id,
        amount: 50,
        type: 'REGISTRATION_BONUS',
        description: `Bono de bienvenida para @${mari.username || 'Usuario'} (manual)`,
        tx_hash: `REGB-${ts}-${rnd}`,
        entry_type: 'CREDIT'
    });
    console.log(`[CLEANUP] Created bonus for ${mari.username}`);
}

main().catch(console.error);
