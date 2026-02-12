
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

const pb = new PocketBase(PB_URL);

// --- INITIAL LEVEL DATA (From store-final.js) ---
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
        console.log(`🔌 Conectando a ${PB_URL}...`);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado como Admin/Superuser.");
    } catch (error) {
        console.error("❌ Error de autenticación. Verifica PB_ADMIN_EMAIL y PB_ADMIN_PASS en .env");
        console.error("Detalle:", error.message);
        process.exit(1);
    }
}

async function createCollectionIfNotExists(name, schema, type = 'base') {
    try {
        await pb.collections.getOne(name);
        console.log(`ℹ️ La colección '${name}' ya existe. Saltando creación.`);
        return false; // No se creó, ya existía
    } catch (e) {
        if (e.status === 404) {
            console.log(`🏗️ Creando colección '${name}'...`);
            await pb.collections.create({
                name: name,
                type: type,
                schema: schema
            });
            console.log(`✅ Colección '${name}' creada con éxito.`);
            return true; // Se creó nueva
        } else {
            throw e;
        }
    }
}

async function setupLedger() {
    const schema = [
        { name: 'from_user', type: 'relation', required: true, options: { collectionId: 'users', cascadeDelete: false, maxSelect: 1, displayFields: ['username'] } },
        { name: 'to_user', type: 'relation', required: false, options: { collectionId: 'users', cascadeDelete: false, maxSelect: 1, displayFields: ['username'] } }, // Nullable for system
        { name: 'amount', type: 'number', required: true, options: { min: 0 } },
        { name: 'type', type: 'select', required: true, options: { values: ['DAILY_LOGIN', 'POST_REWARD', 'LEVEL_UP', 'TIP', 'PURCHASE', 'FEE'], maxSelect: 1 } },
        { name: 'description', type: 'text', required: false },
        { name: 'tx_hash', type: 'text', required: true, options: { min: 10 } } // Unique ID for security
    ];

    // API RULES
    // List/View: Users can see only their own transactions (from or to). Admin sees all.
    // Create: ADMIN ONLY (Backend script). Users NEVER create ledger entries directly.
    // Update/Delete: ADMIN ONLY (Should be never, technically, but admin needs control).

    await createCollectionIfNotExists('ledger', schema);

    // Update Rules specifically (in case collection existed but rules were wrong)
    try {
        const collection = await pb.collections.getOne('ledger');
        await pb.collections.update(collection.id, {
            listRule: `@request.auth.id != "" && (from_user = @request.auth.id || to_user = @request.auth.id)`,
            viewRule: `@request.auth.id != "" && (from_user = @request.auth.id || to_user = @request.auth.id)`,
            createRule: null, // Admin only
            updateRule: null, // Admin only (Immutable ideally)
            deleteRule: null  // Admin only
        });
        console.log("🔒 Reglas de seguridad aplicadas a 'ledger'.");
    } catch (err) {
        console.warn("⚠️ Error aplicando reglas a 'ledger':", err.message);
    }
}

async function setupLevels() {
    const schema = [
        { name: 'level_number', type: 'number', required: true, options: { min: 0 } },
        { name: 'name', type: 'text', required: true },
        { name: 'min_posts', type: 'number', required: true, options: { min: 0 } },
        { name: 'min_copies', type: 'number', required: true, options: { min: 0 } },
        { name: 'icon', type: 'text', required: false },
        { name: 'color', type: 'text', required: false },
        { name: 'benefits', type: 'json', required: false }
    ];

    const wasCreated = await createCollectionIfNotExists('levels', schema);

    // Update Rules
    // List/View: Public (Everyone needs to see level requirements)
    // Create/Update/Delete: Admin only
    try {
        const collection = await pb.collections.getOne('levels');
        await pb.collections.update(collection.id, {
            listRule: "", // Public
            viewRule: "", // Public
            createRule: null,
            updateRule: null,
            deleteRule: null
        });
        console.log("🔒 Reglas de seguridad aplicadas a 'levels'.");

        // Populate Initialization Data if empty
        const existing = await pb.collection('levels').getList(1, 1);
        if (existing.totalItems === 0) {
            console.log("📥 Inyectando niveles iniciales...");
            for (const lvl of INITIAL_LEVELS) {
                await pb.collection('levels').create(lvl);
                console.log(`   + Nivel ${lvl.level_number}: ${lvl.name}`);
            }
            console.log("✅ Niveles iniciales creados.");
        } else {
            console.log("ℹ️ La colección 'levels' ya tiene datos. No se sobreescribieron.");
        }

    } catch (err) {
        console.warn("⚠️ Error configurando 'levels':", err.message);
    }
}

async function main() {
    console.log("🚀 Iniciando Setup de Infraestructura V3...");
    await authenticate();
    await setupLedger();
    await setupLevels();
    console.log("\n🏁 FASE 1 COMPLETADA: Infraestructura lista.");
}

main().catch(console.error);
