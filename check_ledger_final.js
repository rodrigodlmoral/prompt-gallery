
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function checkLedger() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const user = await pb.collection('users').getFirstListItem('username="rodrigodlmoral"');
        console.log(`=== USUARIO: ${user.username} (${user.id}) ===`);
        console.log(`Tokens: ${user.tokens}, Total Earned: ${user.total_earned}, Total Rewards: ${user.total_rewards}`);

        console.log("\n=== ÚLTIMOS 10 REGISTROS EN LEDGER ===");
        const ledger = await pb.collection('ledger').getList(1, 10, {
            filter: `to_user = "${user.id}" || from_user = "${user.id}"`,
            sort: '-created'
        });

        ledger.items.forEach(rec => {
            console.log(`- [${rec.created}] Type: ${rec.type}, Amount: ${rec.amount}, Desc: ${rec.description}, From: ${rec.from_user}, To: ${rec.to_user}`);
        });

        if (ledger.items.length === 1) {
            console.log("\n⚠️ Solo se encontró el registro de migración. Las nuevas transacciones NO se guardaron.");
        }

        // Inspeccionar tipos de campos
        const ledgerColl = await pb.collections.getOne('ledger');
        console.log("\n=== ESQUEMA LEDGER (Campos Clave) ===");
        const fromField = ledgerColl.fields.find(f => f.name === 'from_user');
        const toField = ledgerColl.fields.find(f => f.name === 'to_user');
        console.log(`from_user: type=${fromField.type}, required=${fromField.required}`);
        console.log(`to_user: type=${toField.type}, required=${toField.required}`);

    } catch (err) {
        console.error("Diagnostic failed:", err.message);
    }
}

checkLedger();
