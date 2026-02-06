import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function finalRepair() {
    try {
        console.log("🔧 REPARACIÓN FINAL: Campo correcto 'image'\n");

        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado\n");

        const supabasePrompts = JSON.parse(fs.readFileSync('supabase_prompts.json', 'utf8'));

        // Mapa título -> image_url
        const imageMap = new Map();
        supabasePrompts.forEach(sp => {
            if (sp.title && sp.image_url) {
                const key = sp.title.trim().toLowerCase();
                imageMap.set(key, sp.image_url);
            }
        });

        const pbPrompts = await pb.collection('prompts').getFullList({
            fields: 'id,title'
        });
        console.log(`🔍 Actualizando ${pbPrompts.length} prompts...\n`);

        let updated = 0;
        let notFound = 0;

        for (const pbPrompt of pbPrompts) {
            const key = pbPrompt.title.trim().toLowerCase();
            const imageUrl = imageMap.get(key);

            if (!imageUrl) {
                notFound++;
                continue;
            }

            try {
                // ¡CAMPO CORRECTO!
                await pb.collection('prompts').update(pbPrompt.id, {
                    image: imageUrl
                });
                console.log(`✅ "${pbPrompt.title}"`);
                updated++;
                await new Promise(r => setTimeout(r, 100));
            } catch (err) {
                console.error(`❌ "${pbPrompt.title}": ${err.message}`);
            }
        }

        console.log(`\n🎉 REPARACIÓN FINAL COMPLETADA:`);
        console.log(`   ✅ Actualizados: ${updated}`);
        console.log(`   ❌ No encontrados: ${notFound}`);

    } catch (err) {
        console.error("\n💀 ERROR:", err.message);
    }
}

finalRepair();
