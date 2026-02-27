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

    console.log("--- LIMPÌANDO CAMPOS DE BALANCE LEGACY EN COLECCIÓN USERS ---");

    const users = await pb.collection('users').getFullList({
        fields: 'id,username'
    });

    console.log(`Procesando ${users.length} usuarios...`);

    let updatedCount = 0;
    for (const user of users) {
        try {
            await pb.collection('users').update(user.id, {
                total_earned: 0,
                total_spent: 0,
                total_rewards: 0,
                total_burned: 0
            });
            updatedCount++;
        } catch (err) {
            console.error(`Error actualizando @${user.username || user.id}:`, err.message);
        }
    }

    console.log(`\n--- LIMPIEZA FINALIZADA ---`);
    console.log(`Usuarios actualizados: ${updatedCount}`);
    console.log(`Campos reseteados: total_earned, total_spent, total_rewards, total_burned`);
}

run();
