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

    console.log("--- INICIANDO PURGA DE TOKENS INACTIVOS (0 PROMPTS) ---");

    // 1. Obtener todos los usuarios con saldo
    const users = await pb.collection('users').getFullList({
        filter: 'tokens > 0',
        fields: 'id,username,name,tokens'
    });

    // 2. Obtener todos los prompts para identificar autores
    const prompts = await pb.collection('prompts').getFullList({
        fields: 'author'
    });

    const authors = new Set(prompts.map(p => p.author).filter(id => !!id));

    // 3. Identificar usuarios a purgar (Saldo > 0 AND 0 Prompts AND NOT System)
    const usersToPurge = users.filter(u => !authors.has(u.id) && u.id !== BANK_USER_ID);

    console.log(`Se identificaron ${usersToPurge.length} usuarios para purga.`);

    let userCount = 0;
    let ledgerCount = 0;
    let totalTokensWiped = 0;

    for (const user of usersToPurge) {
        const username = user.username || user.name || 'Sin nombre';
        console.log(`Purgando @${username} (${user.id}): ${user.tokens}💎`);

        try {
            // A. Poner saldo a 0
            await pb.collection('users').update(user.id, { tokens: 0 });

            // B. Borrar historial de ledger (hard delete)
            const ledgerEntries = await pb.collection('ledger').getFullList({
                filter: `from_user = "${user.id}" || to_user = "${user.id}"`,
                fields: 'id'
            });

            for (const entry of ledgerEntries) {
                await pb.collection('ledger').delete(entry.id);
                ledgerCount++;
            }

            userCount++;
            totalTokensWiped += user.tokens;
        } catch (err) {
            console.error(`Error purgando @${username}:`, err.message);
        }
    }

    console.log(`\n--- PURGA FINALIZADA ---`);
    console.log(`Usuarios afectados: ${userCount}`);
    console.log(`Tokens desaparecidos: ${totalTokensWiped}💎`);
    console.log(`Registros de Ledger borrados: ${ledgerCount}`);
    console.log(`------------------------`);
}

run();
