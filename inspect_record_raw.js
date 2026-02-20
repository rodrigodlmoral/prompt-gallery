
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function inspectRecord() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const record = await pb.collection('ledger').getOne('vqlq2jimlj9pzjq');
        console.log("=== FULL RECORD JSON ===");
        console.log(JSON.stringify(record, null, 2));

    } catch (err) {
        console.error("Inspect failed:", err.message);
    }
}

inspectRecord();
