import PocketBase from 'pocketbase';
import fs from 'fs';

// --- CONFIGURACIÓN ---
const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL_DEFAULT = 'tu_email@ejemplo.com';
const ADMIN_PASS_DEFAULT = 'tu_password';

const pb = new PocketBase(PB_URL);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runImport() {
    // Tomar credenciales de argumentos o de variables por defecto
    const args = process.argv.slice(2);
    const email = args[0] || ADMIN_EMAIL_DEFAULT;
    const pass = args[1] || ADMIN_PASS_DEFAULT;

    if (email === ADMIN_EMAIL_DEFAULT) {
        console.error("\n❌ ERROR: Credenciales no proporcionadas.");
        console.log("Uso: node import_to_pocketbase.js <email_admin> <password_admin>");
        console.log("O edita el archivo import_to_pocketbase.js con tus credenciales.");
        return;
    }

    try {
        console.log("\n🚀 INICIANDO MIGRACIÓN FINAL...");
        console.log(`🔗 Instancia: ${PB_URL}`);

        // 1. Login Admin
        console.log("🔐 Autenticando como Admin...");
        try {
            await pb.admins.authWithPassword(email, pass);
            console.log("✅ Autenticado satisfactoriamente.");
        } catch (e) {
            console.error("❌ Fallo de autenticación admin:", e.message);
            return;
        }

        // 2. Cargar Datos
        console.log("📂 Cargando backups de Supabase...");
        if (!fs.existsSync('supabase_profiles.json') || !fs.existsSync('supabase_prompts.json')) {
            console.error("❌ No se encontraron los archivos JSON de respaldo.");
            return;
        }

        const profiles = JSON.parse(fs.readFileSync('supabase_profiles.json', 'utf8'));
        const prompts = JSON.parse(fs.readFileSync('supabase_prompts.json', 'utf8'));
        console.log(`📊 Datos listos: ${profiles.length} perfiles, ${prompts.length} prompts.`);

        const idMap = {};

        // 3. Importar Usuarios
        console.log("\n--- [1/2] IMPORTANDO USUARIOS ---");
        for (let i = 0; i < profiles.length; i++) {
            const up = profiles[i];
            try {
                let record;
                try {
                    record = await pb.collection('users').getFirstListItem(`email="${up.email}"`);
                    console.log(`⏩ [${i + 1}/${profiles.length}] Saltando (ya existe): ${up.email}`);
                } catch (e) {
                    console.log(`📥 [${i + 1}/${profiles.length}] Creando: ${up.username || up.email}`);
                    record = await pb.collection('users').create({
                        email: up.email,
                        password: 'PG_Migration_2024!',
                        passwordConfirm: 'PG_Migration_2024!',
                        username: up.username || `user_${up.id.substring(0, 5)}`,
                        name: up.username || 'Usuario',
                        avatar_url: up.avatar_url,
                        role: up.role || 'user',
                        level: up.level || 0,
                        tokens: up.tokens || 0,
                        supabase_id: up.id,
                        socials: up.socials || {},
                        badges: up.badges || []
                    }, { $autoCancel: false });
                    await delay(200);
                }
                idMap[up.id] = record.id;
            } catch (err) {
                console.error(`❌ Error en usuario ${up.username}:`, err.message);
                if (err.status === 429) {
                    console.log("⏳ Límite alcanzado. Esperando 10s...");
                    await delay(10000);
                    i--;
                }
            }
        }

        // 4. Importar Prompts
        console.log("\n--- [2/2] IMPORTANDO PROMPTS ---");
        for (let i = 0; i < prompts.length; i++) {
            const p = prompts[i];
            try {
                const pbAuthorId = idMap[p.author_id];
                if (!pbAuthorId) {
                    console.warn(`⚠️ Prompt ${p.id} omitido: Autor ${p.author_id} no existe.`);
                    continue;
                }

                console.log(`📥 [${i + 1}/${prompts.length}] Subiendo: ${p.title}`);
                await pb.collection('prompts').create({
                    title: p.title,
                    prompt: p.prompt || '',
                    tool: p.tool,
                    rating: p.rating,
                    image_url: p.image_url,
                    author: pbAuthorId,
                    is_private: p.is_private || false,
                    reactions: p.reactions || {},
                    comments: p.comments || [],
                    saved_by: p.saved_by || [],
                    needs_reference: p.needs_reference || false,
                    orig_creator: p.orig_creator,
                    content: p.content || [],
                    copy_count: p.copy_count || 0,
                    tokens_received: p.tokens_received || 0,
                    is_featured: p.is_featured || false,
                    featured_until: p.featured_until,
                    created_at_original: p.created_at
                }, { $autoCancel: false });
                await delay(150);
            } catch (err) {
                console.error(`❌ Error en prompt ${p.title}:`, err.message);
                if (err.status === 429) {
                    console.log("⏳ Límite alcanzado. Esperando 15s...");
                    await delay(15000);
                    i--;
                }
            }
        }

        console.log("\n✅ MIGRACIÓN FINALIZADA CON ÉXITO.");
        console.log("🌐 Ya puedes ver los datos actualizados en tu web.");

    } catch (err) {
        console.error("\n💀 ERROR CRÍTICO NO CONTROLADO:", err.message);
    }
}

runImport();
