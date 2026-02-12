
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

async function fix() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Auth OK");

        const ledger = await pb.collections.getOne('ledger');
        console.log("🔍 Ledger ID:", ledger.id);

        // Intento 1: Solo reglas de lectura
        console.log("🛠️ Intentando aplicar reglas...");

        // PocketBase Rule Syntax:
        // @request.auth.id != ""  -> Solo usuarios logueados
        // from_user = @request.auth.id -> Solo si soy el remitente
        // to_user = @request.auth.id -> Solo si soy el destinatario

        const rule = "@request.auth.id != '' && (from_user = @request.auth.id || to_user = @request.auth.id)";

        await pb.collections.update(ledger.id, {
            listRule: rule,
            viewRule: rule,
            createRule: null,
            updateRule: null,
            deleteRule: null
        });

        console.log("✅ Reglas aplicadas con éxito.");

        const check = await pb.collections.getOne('ledger');
        console.log("📜 Verificación listRule:", check.listRule);

    } catch (e) {
        console.error("❌ Error aplicando reglas:");
        console.error(JSON.stringify(e.data, null, 2));
    }
}

fix();
