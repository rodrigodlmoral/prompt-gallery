import 'dotenv/config';
import PocketBase from 'pocketbase';
import fs from 'fs';

// Configuration
const PB_URL = process.env.VITE_POCKETBASE_URL;
const CACHE_FILE = './scripts/tags_cache.json';

const pb = new PocketBase(PB_URL);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function phase2_updatePB() {
    try {
        console.log("🚀 Iniciando Fase 2: Actualización de PocketBase (SEGURO y LENTO)...");

        // Auth as Superuser
        const adminEmail = process.env.PB_ADMIN_EMAIL;
        const adminPass = process.env.PB_ADMIN_PASS;
        if (adminEmail && adminPass) {
            console.log("🔑 Autenticando como Superuser...");
            await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
            console.log("✅ Autenticación exitosa.");
        }

        if (!fs.existsSync(CACHE_FILE)) {
            console.error("❌ Error: No se encontró el archivo scripts/tags_cache.json. Ejecuta la Fase 1 primero.");
            process.exit(1);
        }

        const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        const ids = Object.keys(cache);

        console.log(`📝 Procesando ${ids.length} actualizaciones pendientes desde el caché.`);

        for (const id of ids) {
            const data = cache[id];

            // Check if already processed (optional flag in cache)
            if (data.synced) continue;

            console.log(`\n💾 Actualizando: "${data.title}" (${id})`);
            console.log(`🏷️  Tags: ${data.tags.join(', ')}`);

            // Safe & Slow: 10 seconds delay per update (TOTAL SECURITY)
            await sleep(10000);

            try {
                await pb.collection('prompts').update(id, {
                    tags: data.tags
                });

                // Mark as synced and save cache
                data.synced = true;
                fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
                console.log("✅ Base de datos actualizada.");
            } catch (err) {
                console.error(`❌ Fallo al actualizar post ${id}:`, err.message);
            }
        }

        console.log("\n✨ Fase 2 finalizada. Todos los posts en caché han sido sincronizados.");

    } catch (error) {
        console.error("❌ Error General Fase 2:", error);
    }
}

phase2_updatePB();
