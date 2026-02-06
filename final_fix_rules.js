import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function finalFixAPIRules() {
    try {
        console.log("🔧 REPARACIÓN FINAL Y DEFINITIVA\n");

        // Auth
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado\n");

        // Get collection
        const collections = await pb.collections.getFullList();
        const promptsCol = collections.find(c => c.name === 'prompts');

        console.log("📋 ESTADO ACTUAL:");
        console.log(`   listRule: "${promptsCol.listRule}"`);
        console.log(`   viewRule: "${promptsCol.viewRule}"\n`);

        // Update with NO RESTRICTIONS
        console.log("🔓 Configurando acceso COMPLETAMENTE PÚBLICO...");
        await pb.collections.update(promptsCol.id, {
            listRule: null,
            viewRule: null,
            createRule: "@request.auth.id != ''",
            updateRule: "@request.auth.id = author",
            deleteRule: "@request.auth.id = author"
        });

        console.log("✅ Reglas actualizadas\n");

        // Verify
        const updated = await pb.collections.getOne(promptsCol.id);
        console.log("📋 NUEVO ESTADO:");
        console.log(`   listRule: ${updated.listRule === null ? 'NULL (público)' : `"${updated.listRule}"`}`);
        console.log(`   viewRule: ${updated.viewRule === null ? 'NULL (público)' : `"${updated.viewRule}"`}\n`);

        // Test public access
        pb.authStore.clear();
        console.log("🧪 PROBANDO ACCESO PÚBLICO...");

        try {
            const test = await pb.collection('prompts').getList(1, 5);
            console.log(`✅ ¡FUNCIONA! ${test.totalItems} prompts accesibles`);
            console.log(`   Primer prompt: "${test.items[0].title}"\n`);
            console.log("🎉 PROBLEMA RESUELTO");
        } catch (testErr) {
            console.error(`❌ SIGUE FALLANDO: ${testErr.message}`);
            console.error(`Status: ${testErr.status}`);
            console.error("\n⚠️  PUEDE SER UN PROBLEMA DE POCKETHOST");
            console.error("Contacta a su soporte o verifica la configuración de la instancia.");
        }

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    }
}

finalFixAPIRules();
