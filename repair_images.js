import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function repairImages() {
    try {
        console.log("🔧 REPARACIÓN COMPLETA: Agregando image_url\n");

        // Auth
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado\n");

        // Cargar datos
        const supabasePrompts = JSON.parse(fs.readFileSync('supabase_prompts.json', 'utf8'));

        // Crear mapa título -> image_url (normalizado para comparación)
        const imageMap = new Map();
        supabasePrompts.forEach(sp => {
            if (sp.title && sp.image_url) {
                const key = sp.title.trim().toLowerCase();
                imageMap.set(key, sp.image_url);
            }
        });
        console.log(`📂 Mapa de imágenes creado con ${imageMap.size} entradas\n`);

        // Obtener prompts de PocketBase
        const pbPrompts = await pb.collection('prompts').getFullList({
            fields: 'id,title'
        });
        console.log(`🔍 Procesando ${pbPrompts.length} prompts...\n`);

        let updated = 0;
        let notFound = 0;

        for (const pbPrompt of pbPrompts) {
            const key = pbPrompt.title.trim().toLowerCase();
            const imageUrl = imageMap.get(key);

            if (!imageUrl) {
                console.log(`❌ "${pbPrompt.title}": No encontrado en respaldo`);
                notFound++;
                continue;
            }

            try {
                await pb.collection('prompts').update(pbPrompt.id, {
                    image_url: imageUrl
                });
                console.log(`✅ "${pbPrompt.title}"`);
                updated++;
                await new Promise(r => setTimeout(r, 120));
            } catch (err) {
                console.error(`❌ Error en "${pbPrompt.title}": ${err.message}`);
            }
        }

        console.log(`\n🎉 COMPLETADO:`);
        console.log(`   ✅ Actualizados: ${updated}`);
        console.log(`   ❌ No encontrados: ${notFound}`);

    } catch (err) {
        console.error("\n💀 ERROR:", err.message);
    }
}

repairImages();
