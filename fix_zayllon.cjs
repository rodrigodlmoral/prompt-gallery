const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const BANK_USER_ID = 'z44ierjl0thcczd';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('[ZAYLLON] Admin authenticated');

    // 1. Get ALL users and filter in memory to avoid 400 Filter error
    console.log('[ZAYLLON] Fetching users for memory filtering...');
    const allUsers = await pb.collection('users').getFullList({
        fields: 'id,username,name',
        $autoCancel: false
    });

    const targetUser = allUsers.find(u => {
        const uname = (u.username || '').toLowerCase();
        const fname = (u.name || '').toLowerCase();
        return uname.includes('zayllon') || fname.includes('zayllon');
    });

    if (!targetUser) {
        console.log('[ZAYLLON] ❌ User "Zayllon" STILL not found in memory.');
        // Log some users for debugging
        console.log('[ZAYLLON] Sample users for debug:', allUsers.slice(0, 5).map(u => u.username));
        return;
    }

    console.log(`[ZAYLLON] ✅ Found user: @${targetUser.username} (ID: ${targetUser.id})`);

    // 2. Check if registration bonus already exists
    const existing = await pb.collection('ledger').getList(1, 1, {
        filter: `to_user = "${targetUser.id}" && type = "REGISTRATION_BONUS"`
    });

    if (existing.totalItems > 0) {
        console.log('[ZAYLLON] ⚠️ Registration bonus already exists for this user.');
        return;
    }

    // 3. Create the entry
    console.log('[ZAYLLON] Creating ledger entry...');
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
    const txHash = `REGB-${ts}-${rnd}`;

    await pb.collection('ledger').create({
        from_user: BANK_USER_ID,
        to_user: targetUser.id,
        amount: 50,
        type: 'REGISTRATION_BONUS',
        description: `Bono de bienvenida para @${targetUser.username || 'Zayllon'} (manual fix)`,
        tx_hash: txHash,
        entry_type: 'CREDIT'
    });

    console.log('[ZAYLLON] 🚀 SUCCESS! Registration bonus created for @Zayllon.');
}

main().catch(console.error);
