
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function verifyLedger() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const user = await pb.collection('users').getFirstListItem('username="rodrigodlmoral"');
        console.log(`=== ANALIZANDO LEDGER PARA USUARIO: ${user.username} (${user.id}) ===`);

        // Obtener todos los registros del ledger para este usuario (recibidos o enviados)
        const ledger = await pb.collection('ledger').getFullList({
            filter: `to_user = "${user.id}" || from_user = "${user.id}"`,
            sort: '-created'
        });

        console.log(`Total de registros encontrados en el Ledger real: ${ledger.length}`);

        ledger.forEach((rec, i) => {
            console.log(`${i + 1}. [${rec.created}] TIPO: ${rec.type} | CANT: ${rec.amount} | DESC: ${rec.description?.slice(0, 30)}... | FROM: ${rec.from_user || 'NULL (Sistema)'}`);
        });

        if (ledger.length === 0) {
            console.log("\n❌ NO SE ENCONTRARON REGISTROS. Las transacciones no se están guardando en la DB.");
        }

    } catch (err) {
        console.error("Verification failed:", err.message);
    }
}

verifyLedger();
