
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function ledgerSortById() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("Reading from ledger sorted by '-id'...");
        const ledger = await pb.collection('ledger').getList(1, 5, {
            sort: '-id'
        });

        console.log("Success! Items found:", ledger.items.length);
        ledger.items.forEach(item => {
            console.log(`- ${item.id}: ${item.type} | ${item.amount} | created: ${item.created}`);
        });

    } catch (err) {
        console.error("Sort by ID failed:", err.message);
        if (err.data) console.error("Error data:", JSON.stringify(err.data, null, 2));
    }
}

ledgerSortById();
