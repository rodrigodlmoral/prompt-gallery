
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
        console.log("✅ Auth OK");
    } catch (error) {
        console.error("❌ Auth Error:", error.message);
        process.exit(1);
    }
}

async function addField(collName, fieldData) {
    try {
        const col = await pb.collections.getOne(collName);
        const newFields = [...col.fields, fieldData];

        await pb.collections.update(col.id, {
            fields: newFields
        });
        console.log(`✅ Campo '${fieldData.name}' agregado.`);
    } catch (e) {
        console.error(`❌ Fallo agregando '${fieldData.name}':`, JSON.stringify(e.data || e.message));
    }
}

async function recreateEmpty(name) {
    try {
        try {
            const col = await pb.collections.getOne(name);
            await pb.collections.delete(col.id);
            console.log(`🗑️ Borrada ${name}`);
        } catch (e) { }

        await pb.collections.create({
            name: name,
            type: 'base'
        });
        console.log(`🏗️ Creada ${name} (vacía)`);
        return true;
    } catch (e) {
        console.error(`❌ Fallo creando ${name} base:`, e.message);
        return false;
    }
}

async function main() {
    await authenticate();

    // 1. SETUP LEDGER (FLATTENED)
    const usersCol = await pb.collections.getOne('users');
    console.log("Users ID:", usersCol.id);

    if (await recreateEmpty('ledger')) {
        // FLAT STRUCTURE TEST
        await addField('ledger', { name: 'amount', type: 'number', required: true, min: 0 });
        await addField('ledger', { name: 'description', type: 'text', required: false });
        await addField('ledger', { name: 'tx_hash', type: 'text', required: true, min: 10 });

        // SELECT (Flat)
        await addField('ledger', {
            name: 'type',
            type: 'select',
            required: true,
            values: ['DAILY_LOGIN', 'POST_REWARD', 'LEVEL_UP', 'TIP', 'PURCHASE', 'FEE'],
            maxSelect: 1
        });

        // RELATIONS (Flat)
        await addField('ledger', {
            name: 'from_user',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            displayFields: ['username']
        });

        await addField('ledger', {
            name: 'to_user',
            type: 'relation',
            required: false,           // Nullable
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            displayFields: ['username']
        });

        // Rules
        try {
            const l = await pb.collections.getOne('ledger');
            const rule = "@request.auth.id != '' && (from_user = @request.auth.id || to_user = @request.auth.id)";
            await pb.collections.update(l.id, {
                listRule: rule,
                viewRule: rule
            });
            console.log("✅ Rules Ledger OK");
        } catch (e) { console.error("Rules Fail", e.data); }
    }
}

main();
