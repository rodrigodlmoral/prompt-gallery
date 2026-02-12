
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

// --- INITIAL LEVEL DATA ---
const INITIAL_LEVELS = [
    { level_number: 0, name: 'Explorador', min_posts: 0, min_copies: 0, icon: '🛡️', color: '#888888', benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits'] },
    { level_number: 1, name: 'Novato', min_posts: 10, min_copies: 0, icon: '🌱', color: '#4caf50', benefits: ['Publicar Secuencias (Multi-imagen)'] },
    { level_number: 2, name: 'Creador Jr', min_posts: 25, min_copies: 0, icon: '🎨', color: '#2196f3', benefits: ['Cambiar foto de perfil', 'Añadir redes sociales al perfil'] },
    { level_number: 3, name: 'Creador', min_posts: 50, min_copies: 15, icon: '🏆', color: '#ff9800', benefits: ['Sin cooldown en comentarios', 'Medalla especial de plata'] },
    { level_number: 4, name: 'Artista', min_posts: 100, min_copies: 40, icon: '💎', color: '#9c27b0', benefits: ['Destacar tus propios posts (Self-Promo)', 'Panel de estadísticas avanzado'] },
    { level_number: 5, name: 'Maestro', min_posts: 250, min_copies: 80, icon: '👑', color: '#ffd700', benefits: ['Herramientas de moderación básica', 'Soporte prioritario 24/7'] }
];

async function authenticate() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado.");
    } catch (error) {
        console.error("❌ Auth Error:", error.message);
        process.exit(1);
    }
}

async function recreateCollection(name, fields, rules = {}) {
    try {
        // 1. Delete if exists
        try {
            const col = await pb.collections.getOne(name);
            console.log(`🗑️ Eliminando colección rota '${name}'...`);
            await pb.collections.delete(col.id);
        } catch (e) { /* Ignore 404 */ }

        // 2. Create with FIELDS (New PB Syntax)
        console.log(`🏗️ Creando colección '${name}'...`);

        // Intentamos enviar tanto 'schema' (legacy) como 'fields' (new) por si acaso, 
        // pero PB suele ignorar lo que no conoce.
        // Wait, 'fields' is strictly better for new versions.

        await pb.collections.create({
            name: name,
            type: 'base',
            fields: fields, // NEW SYNTAX
            schema: fields, // FALLBACK just in case
            ...rules
        });
        console.log(`✅ Colección '${name}' creada.`);
        return true;
    } catch (e) {
        console.error(`❌ Error creando '${name}':`, JSON.stringify(e.data, null, 2));
        throw e;
    }
}

async function main() {
    await authenticate();

    // GET USERS ID
    const usersCol = await pb.collections.getOne('users');
    const usersId = usersCol.id;
    console.log(`ℹ️ Users Collection ID: ${usersId}`);

    // --- LEDGER ---
    const ledgerFields = [
        { name: 'from_user', type: 'relation', required: true, options: { collectionId: usersId, cascadeDelete: false, maxSelect: 1, displayFields: ['username'] } },
        { name: 'to_user', type: 'relation', required: false, options: { collectionId: usersId, cascadeDelete: false, maxSelect: 1, displayFields: ['username'] } },
        { name: 'amount', type: 'number', required: true, options: { min: 0 } },
        { name: 'type', type: 'select', required: true, options: { values: ['DAILY_LOGIN', 'POST_REWARD', 'LEVEL_UP', 'TIP', 'PURCHASE', 'FEE'], maxSelect: 1 } },
        { name: 'description', type: 'text', required: false },
        { name: 'tx_hash', type: 'text', required: true, options: { min: 10 } }
    ];

    const ledgerRule = "@request.auth.id != '' && (from_user = @request.auth.id || to_user = @request.auth.id)";

    await recreateCollection('ledger', ledgerFields, {
        listRule: ledgerRule,
        viewRule: ledgerRule,
        createRule: null,
        updateRule: null,
        deleteRule: null
    });

    // --- LEVELS ---
    const levelsFields = [
        { name: 'level_number', type: 'number', required: true, options: { min: 0 } },
        { name: 'name', type: 'text', required: true },
        { name: 'min_posts', type: 'number', required: true, options: { min: 0 } },
        { name: 'min_copies', type: 'number', required: true, options: { min: 0 } },
        { name: 'icon', type: 'text', required: false },
        { name: 'color', type: 'text', required: false },
        { name: 'benefits', type: 'json', required: false }
    ];

    await recreateCollection('levels', levelsFields, {
        listRule: "", // Public
        viewRule: "", // Public
        createRule: null,
        updateRule: null,
        deleteRule: null
    });

    // --- POPULATE LEVELS ---
    console.log("📥 Inyectando niveles...");
    const levelCol = await pb.collections.getOne('levels'); // Check if it really exists now

    // We can't batch create easily without ID check, so loop
    for (const lvl of INITIAL_LEVELS) {
        try {
            await pb.collection('levels').create(lvl);
            process.stdout.write(`+${lvl.level_number} `);
        } catch (e) {
            console.error(`\n❌ Error insertando nivel ${lvl.level_number}:`, e.data || e.message);
        }
    }
    console.log("\n✅ Niveles inyectados.");
}

main().catch(console.error);
