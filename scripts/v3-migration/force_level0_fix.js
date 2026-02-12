
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
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

    console.log("🛠️ Forzando fix de Schema para Nivel 0...");

    // 1. Update Schema
    const col = await pb.collections.getOne('levels');
    const fields = col.fields;

    let updated = false;
    fields.forEach(f => {
        if (f.name === 'level_number') {
            f.required = false;
            updated = true;
            console.log("   - level_number: required -> false");
        }
    });

    if (updated) {
        await pb.collections.update(col.id, { fields: fields });
        console.log("✅ Schema actualizado.");
    } else {
        console.log("ℹ️ Schema ya estaba actualizado o no se encontró campo.");
    }

    // 2. Insert Level 0
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
        console.log("✅ Nivel 0 creado.");
    } catch (e) {
        // If it already exists (unlikely given verify output), ignore
        console.error("❌ Error creando Nivel 0:", JSON.stringify(e.data || e.message));
    }
}

main().catch(console.error);
