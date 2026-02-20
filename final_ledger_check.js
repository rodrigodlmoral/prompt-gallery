
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function finalLedgerCheck() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("Reading last 5 items from ledger including system fields...");
        const ledger = await pb.collection('ledger').getList(1, 5, {
            sort: '-id' // Use ID as fallback since created might be broken
        });

        console.log("=== RECORDS FOUND ===");
        ledger.items.forEach(item => {
            console.log(`ID: ${item.id} | TYPE: ${item.type} | created: "${item.created}" | updated: "${item.updated}"`);
        });

    } catch (err) {
        console.error("Diagnostic failed:", err.message);
    }
}

finalLedgerCheck();
