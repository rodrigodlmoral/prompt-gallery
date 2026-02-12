
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

async function verify() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        const collection = await pb.collections.getOne('users');
        console.log("🔍 Verificando campos en 'users'...");

        const level = collection.fields.find(f => f.name === 'level');
        const progress = collection.fields.find(f => f.name === 'level_progress');

        if (level) console.log(`✅ Campo 'level': FOUND (Type: ${level.type})`);
        else console.error("❌ Campo 'level': MISSING");

        if (progress) console.log(`✅ Campo 'level_progress': FOUND (Type: ${progress.type})`);
        else console.error("❌ Campo 'level_progress': MISSING");

    } catch (e) {
        console.error("❌ Error de verificación:", e.message);
    }
}

verify();
