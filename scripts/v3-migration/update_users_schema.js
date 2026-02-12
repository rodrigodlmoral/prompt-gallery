
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

async function authenticate() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado como Admin.");
    } catch (error) {
        console.error("❌ Auth Error:", error.message);
        process.exit(1);
    }
}

async function updateUsersSchema() {
    try {
        const collection = await pb.collections.getOne('users');
        console.log(`🔍 Schema actual de 'users' cargado. ID: ${collection.id}`);

        const fields = collection.fields || collection.schema; // Compatibility
        let modified = false;

        // 1. Check/Add 'level' field
        if (!fields.find(f => f.name === 'level')) {
            console.log("➕ Añadiendo campo 'level'...");
            fields.push({
                name: 'level',
                type: 'number',
                required: false,
                min: 0,
                max: 5,
                // presentable: true // Optional
            });
            modified = true;
        } else {
            console.log("ℹ️ Campo 'level' ya existe.");
        }

        // 2. Check/Add 'level_progress' field
        if (!fields.find(f => f.name === 'level_progress')) {
            console.log("➕ Añadiendo campo 'level_progress'...");
            fields.push({
                name: 'level_progress',
                type: 'number',
                required: false,
                min: 0,
                max: 100
            });
            modified = true;
        } else {
            console.log("ℹ️ Campo 'level_progress' ya existe.");
        }

        if (modified) {
            console.log("💾 Guardando cambios en Schema...");
            // Use flat fields structure for update
            await pb.collections.update(collection.id, { fields: fields });
            console.log("✅ Schema de 'users' actualizado correctamente.");
        } else {
            console.log("✅ No se requirieron cambios.");
        }

    } catch (e) {
        console.error("❌ Error actualizando schema:", JSON.stringify(e.data || e.message, null, 2));
    }
}

async function main() {
    await authenticate();
    await updateUsersSchema();
}

main().catch(console.error);
