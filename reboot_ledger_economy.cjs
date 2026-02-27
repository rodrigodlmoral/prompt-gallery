const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function run() {
    const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
    const pb = new PocketBase(PB_URL);

    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    } catch (e) {
        await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    }

    const BANK_USER_ID = 'z44ierjl0thcczd';

    console.log("--- INICIANDO HARD RESET DE ECONOMÍA (LEDGER REBOOT) ---");

    // 1. BORRAR TODO EL LEDGER
    console.log("1. Borrando todos los registros de Ledger...");
    const allLedger = await pb.collection('ledger').getFullList({ fields: 'id' });
    console.log(`Borrando ${allLedger.length} registros...`);

    for (const entry of allLedger) {
        await pb.collection('ledger').delete(entry.id);
    }
    console.log("Ledger vacío.");

    // 2. IDENTIFICAR USUARIOS CON SALDO > 0
    console.log("2. Identificando usuarios con saldo activo...");
    const activeUsers = await pb.collection('users').getFullList({
        filter: 'tokens > 0',
        fields: 'id,username,name,tokens'
    });

    // Excluir al banco si por casualidad tiene saldo positivo (no debería ser el caso de emisión)
    const filteredUsers = activeUsers.filter(u => u.id !== BANK_USER_ID);
    console.log(`Se encontraron ${filteredUsers.length} usuarios con saldo.`);

    // 3. CREAR NUEVOS REGISTROS EN LEDGER
    console.log("3. Creando registros de Ajuste Febrero...");
    let entriesCreated = 0;
    let totalTokensRecorded = 0;

    for (const user of filteredUsers) {
        const username = user.username || user.name || 'Sin nombre';
        const amount = user.tokens;

        console.log(`Creando entrada para @${username} por ${amount}💎`);

        try {
            await pb.collection('ledger').create({
                from_user: BANK_USER_ID,
                to_user: user.id,
                amount: amount,
                type: 'GIFT',
                description: 'Ajuste de PromptBits - Febrero',
                entry_type: 'CREDIT',
                tx_hash: `REBOOT-FEB-${user.id.substring(0, 6)}`
            });
            entriesCreated++;
            totalTokensRecorded += amount;
        } catch (err) {
            console.error(`Error creando entrada para @${username}:`, err.message);
        }
    }

    console.log(`\n--- HARD RESET FINALIZADO ---`);
    console.log(`Registros borrados: ${allLedger.length}`);
    console.log(`Nuevos registros creados: ${entriesCreated}`);
    console.log(`Tokens respaldados en Ledger: ${totalTokensRecorded}💎`);
    console.log(`-----------------------------`);
}

run();
