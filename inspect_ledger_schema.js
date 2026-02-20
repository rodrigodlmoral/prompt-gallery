
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function inspectLedgerDetails() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const ledgerColl = await pb.collections.getOne('ledger');
        console.log("=== ESQUEMA LEDGER ===");
        ledgerColl.fields.forEach(f => {
            console.log(`- ${f.name}: type=${f.type}, required=${f.required || false}`);
        });

        // Ver una transacción de migración existente
        const ledger = await pb.collection('ledger').getList(1, 1);
        if (ledger.items.length > 0) {
            console.log("\n=== EJEMPLO DE TRANSACCIÓN (MIGRACIÓN) ===");
            console.log(JSON.stringify(ledger.items[0], null, 2));
        }

    } catch (err) {
        console.error("Inspection failed:", err.message);
    }
}

inspectLedgerDetails();
