import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function populateAuthorNames() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        console.log("=== POBLANDO AUTHOR_NAME EN PROMPTS ===\n");

        // 1. Crear un mapa de user ID -> name
        console.log("1. Cargando usuarios...");
        const allUsers = await pb.collection('users').getFullList();
        const userMap = {};
        allUsers.forEach(u => {
            userMap[u.id] = u.name || 'Explorador';
        });
        console.log(`✅ ${allUsers.length} usuarios cargados\n`);

        // 2. Actualizar todos los prompts
        console.log("2. Actualizando prompts...");
        const allPrompts = await pb.collection('prompts').getFullList();

        let updated = 0;
        let errors = 0;

        for (const prompt of allPrompts) {
            try {
                const authorName = userMap[prompt.author] || 'Explorador';

                if (prompt.author_name !== authorName) {
                    await pb.collection('prompts').update(prompt.id, {
                        author_name: authorName
                    });
                    updated++;
                    if (updated % 10 === 0) {
                        console.log(`   Actualizados: ${updated}/${allPrompts.length}`);
                    }
                }
            } catch (err) {
                errors++;
                console.error(`   Error en "${prompt.title}": ${err.message}`);
            }
        }

        console.log(`\n✅ COMPLETADO:`);
        console.log(`   - Actualizados: ${updated}`);
        console.log(`   - Errores: ${errors}`);
        console.log(`   - Total procesados: ${allPrompts.length}`);

    } catch (err) {
        console.error("Error fatal:", err.message);
    }
}

populateAuthorNames();
