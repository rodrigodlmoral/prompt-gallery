
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function inspectLedgerOptions() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const ledgerColl = await pb.collections.getOne('ledger');
        const typeField = ledgerColl.fields.find(f => f.name === 'type');
        console.log("=== OPCIONES DEL CAMPO 'type' ===");
        console.log(JSON.stringify(typeField.values || typeField.options?.values, null, 2));

    } catch (err) {
        console.error("Inspection failed:", err.message);
    }
}

inspectLedgerOptions();
