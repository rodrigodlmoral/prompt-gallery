
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

const pb = new PocketBase(PB_URL);

async function main() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        console.log("🛠️ Intentando reparar Nivel 0...");

        const lvl0 = {
            level_number: 0,
            name: 'Explorador',
            min_posts: 0,
            min_copies: 0,
            icon: '🛡️',
            color: '#888888',
            benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits']
        };

        try {
            await pb.collection('levels').create(lvl0);
            console.log("✅ Nivel 0 creado con éxito.");
        } catch (e) {
            console.error("❌ Fallo Nivel 0:", JSON.stringify(e.data || e.message));

            // Fix Schema if necessary
            if (e.data?.level_number?.message === "Cannot be blank.") {
                console.log("⚠️ Detectado problema con level_number=0. Relajando requisito...");
                const col = await pb.collections.getOne('levels');

                // Find level_number field
                const fields = col.fields;
                fields.forEach(f => {
                    if (f.name === 'level_number') f.required = false;
                });

                await pb.collections.update(col.id, { fields: fields });
                console.log("✅ Schema actualizado (required=false). Reintentando...");

                await pb.collection('levels').create(lvl0);
                console.log("✅ Nivel 0 creado tras fix.");
            }
        }

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

main();
