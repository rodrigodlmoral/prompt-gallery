
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

        console.log("🔍 Verificando Colecciones V3...");

        try {
            const ledger = await pb.collections.getOne('ledger');
            console.log(JSON.stringify(ledger, null, 2));
        } catch (e) {
            console.error("❌ Colección 'ledger' NO encontrada.");
        }

        try {
            const levels = await pb.collection('levels').getFullList({ sort: 'level_number' });
            console.log(`\n📂 [levels items] (Total: ${levels.length})`);
            console.log(levels.map(l => `${l.level_number}: ${l.name} (Posts: ${l.min_posts})`).join('\n'));
        } catch (e) {
            console.error("❌ Colección 'levels' NO encontrada o vacía.");
        }

    } catch (e) {
        console.error("❌ Auth Error:", e.message);
    }
}

verify();
