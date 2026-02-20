
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function simpleLedgerRead() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("Reading first 10 items from ledger (SORTED)...");
        const ledger = await pb.collection('ledger').getList(1, 10, {
            sort: '-created'
        });

        console.log("Success! Items found:", ledger.items.length);
        ledger.items.forEach(item => {
            console.log(`- ${item.id}: ${item.type} | ${item.amount} | to: ${item.to_user} | from: ${item.from_user}`);
        });

    } catch (err) {
        console.error("Simple read failed:", err.message);
        if (err.data) console.error("Error data:", JSON.stringify(err.data, null, 2));
    }
}

simpleLedgerRead();
