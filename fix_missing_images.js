import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

// Usar las credenciales que ya conocemos
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function fixMissingImages() {
    try {
        console.log("🔧 REPARANDO GALERÍA: Agregando image_url faltante\n");

        // 1. Autenticar como Admin
        console.log("🔐 Autenticando...");
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado\n");

        // 2. Cargar JSON de respaldo
        const supabasePrompts = JSON.parse(fs.readFileSync('supabase_prompts.json', 'utf8'));
        console.log(`📂 Cargados ${supabasePrompts.length} prompts de respaldo\n`);

        // 3. Obtener todos los prompts actuales
        const pbPrompts = await pb.collection('prompts').getFullList({
            fields: 'id,title,supabase_id' // Solo campos necesarios
        });
        console.log(`🔍 Encontrados ${pbPrompts.length} prompts en PocketBase\n`);

        // 4. Crear mapa de Supabase ID -> Image URL
        const imageMap = {};
        supabasePrompts.forEach(sp => {
            if (sp.id && sp.image_url) {
                imageMap[sp.id] = sp.image_url;
            }
        });

        // 5. Actualizar cada prompt
        let updated = 0;
        let skipped = 0;

        for (const pbPrompt of pbPrompts) {
            const supabaseId = pbPrompt.supabase_id;

            if (!supabaseId) {
                console.log(`⏩ "${pbPrompt.title}": Sin supabase_id, saltando`);
                skipped++;
                continue;
            }

            const imageUrl = imageMap[supabaseId];

            if (!imageUrl) {
                console.log(`⚠️  "${pbPrompt.title}": No tiene imagen en Supabase`);
                skipped++;
                continue;
            }

            try {
                await pb.collection('prompts').update(pbPrompt.id, {
                    image_url: imageUrl
                });
                console.log(`✅ "${pbPrompt.title}": Imagen agregada`);
                updated++;
            } catch (err) {
                console.error(`❌ "${pbPrompt.title}": Error - ${err.message}`);
            }

            // Pequeño delay para evitar rate limits
            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`\n🎉 REPARACIÓN COMPLETADA`);
        console.log(`   - Actualizados: ${updated}`);
        console.log(`   - Saltados: ${skipped}`);

    } catch (err) {
        console.error("\n💀 ERROR CRÍTICO:", err.message);
    }
}

fixMissingImages();
