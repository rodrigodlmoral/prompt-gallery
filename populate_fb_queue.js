import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function populateQueue() {
    try {
        console.log("🔑 Autenticando como Admin...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🔍 Buscando últimos prompts SFW/Sugestivos...");
        // Buscamos los últimos prons (SFW o Sugestivo) que tengan imagen pública
        const prompts = await pb.collection('prompts').getList(1, 15, {
            filter: 'rating = "SFW / Apto" || rating = "Sugestivo"',
            sort: '-created'
        });

        console.log(`✅ Encontrados ${prompts.items.length} prompts para encolar.`);

        for (const prompt of prompts.items) {
            try {
                // Verificar si ya está en la cola para evitar duplicados
                const existing = await pb.collection('facebook_queue').getList(1, 1, {
                    filter: `prompt = "${prompt.id}"`
                });

                if (existing.totalItems > 0) {
                    console.log(`⏩ Saltando "${prompt.title}" (Ya está en la cola)`);
                    continue;
                }

                await pb.collection('facebook_queue').create({
                    prompt: prompt.id,
                    status: 'pending',
                    added_by: null // Al ser script, no ponemos usuario o ponemos el admin si se prefiere
                });

                console.log(`➕ Encolado: "${prompt.title}"`);
            } catch (itemErr) {
                console.warn(`⚠️ Error encolando "${prompt.title}":`, itemErr.message);
            }
        }

        console.log("\n✨ Proceso completado. Revisa PocketBase.");

    } catch (err) {
        console.error("❌ Error General:", err.message);
    }
}

populateQueue();
