const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function fix() {
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS, { $autoCancel: false });

    const users = await pb.collection('users').getFullList({ $autoCancel: false });
    const user = users.find(u => (u.username || '').toLowerCase() === 'rodrigodlmoral' || (u.name || '').toLowerCase() === 'rodrigodlmoral');

    if (!user) {
        console.log('User not found. Sample of users:', users.slice(0, 5).map(u => u.username));
        return;
    }
    console.log("Found User:", user.id);

    // Find the latest active boost from this user
    let boosts = await pb.collection('boosts').getFullList({
        filter: `user="${user.id}"`,
        $autoCancel: false
    });
    boosts.sort((a, b) => new Date(b.created) - new Date(a.created));

    if (boosts.length === 0) {
        console.log("No boosts found for this user.");
        return;
    }

    const latestBoost = boosts[0];
    console.log(`Latest Boost: ID=${latestBoost.id} | Type=${latestBoost.type} | Price=${latestBoost.price_paid} | Created=${latestBoost.created}`);

    // Check if a ledger entry already exists with this boost ID in the description
    const existingLedger = await pb.collection('ledger').getList(1, 1, {
        filter: `from_user="${user.id}"`,
        $autoCancel: false
    });

    const duplicate = existingLedger.items.find(l => (l.description || '').includes(latestBoost.id));
    if (duplicate) {
        console.log("Ledger entry already exists for this boost:", duplicate.id);
        return;
    }

    // Insert the missing ledger entry
    console.log("Inserting missing ledger entry...");
    const BANK_USER_ID = 'z44ierjl0thcczd';
    const txHash = "BOOS-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const entry = await pb.collection('ledger').create({
        from_user: user.id,
        to_user: BANK_USER_ID,
        amount: latestBoost.price_paid || 45,
        type: 'PURCHASE',
        description: `Boost TOP DIARIO: ${latestBoost.id}`,
        tx_hash: txHash,
        entry_type: 'DEBIT'
    }, { $autoCancel: false });

    console.log("✅ Successfully inserted backfill ledger entry:", entry.id);
}

fix().catch(console.error);
