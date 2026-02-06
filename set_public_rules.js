import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function setExplicitPublicRules() {
    try {
        console.log("🔧 CONFIGURANDO REGLAS EXPLÍCITAS DE ACCESO PÚBLICO\n");

        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        const collections = await pb.collections.getFullList();
        const promptsCol = collections.find(c => c.name === 'prompts');

        // Reglas EXPLÍCITAS que permiten acceso público
        // En PocketBase, una regla vacía "" significa "todos pueden acceder"
        console.log("📝 Aplicando reglas...");
        await pb.collections.update(promptsCol.id, {
            listRule: "",  // String vacío = acceso público
            viewRule: "",  // String vacío = acceso público  
            createRule: "@request.auth.id != ''",
            updateRule: "@request.auth.id = author",
            deleteRule: "@request.auth.id = author"
        });

        console.log("✅ Reglas aplicadas\n");

        //  Verificar
        const updated = await pb.collections.getOne(promptsCol.id);
        console.log("📋 CONFIGURACIÓN:");
        console.log(`   listRule: "${updated.listRule}"`);
        console.log(`   viewRule: "${updated.viewRule}"\n`);

        // Test
        pb.authStore.clear();
        console.log("🧪 PROBANDO...");

        const test = await pb.collection('prompts').getList(1, 5);
        console.log(`✅ ¡FUNCIONA! ${test.totalItems} prompts`);
        console.log(`   "${test.items[0].title}"`);

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        console.error("Status:", err.status);
    }
}

setExplicitPublicRules();
