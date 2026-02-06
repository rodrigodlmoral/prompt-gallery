import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function debugCurrentState() {
    console.log("=== DIAGNÓSTICO PROFUNDO ===\n");

    try {
        // 1. Ver reglas actuales
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        const collections = await pb.collections.getFullList();
        const promptsCol = collections.find(c => c.name === 'prompts');

        console.log("1. REGLAS ACTUALES:");
        console.log(`   listRule: "${promptsCol.listRule}"`);
        console.log(`   viewRule: "${promptsCol.viewRule}"\n`);

        // 2. Probar como admin
        console.log("2. PROBANDO COMO ADMIN:");
        try {
            const adminTest = await pb.collection('prompts').getList(1, 2);
            console.log(`   ✅ Funciona: ${adminTest.totalItems} prompts\n`);
        } catch (err) {
            console.log(`   ❌ Falla: ${err.message}\n`);
        }

        // 3. Probar como público
        pb.authStore.clear();
        console.log("3. PROBANDO COMO PÚBLICO (SIN AUTH):");
        try {
            const publicTest = await pb.collection('prompts').getList(1, 2);
            console.log(`   ✅ Funciona: ${publicTest.totalItems} prompts`);
            console.log(`   Primer prompt: "${publicTest.items[0]?.title}"\n`);
        } catch (err) {
            console.log(`   ❌ FALLA: ${err.message}`);
            console.log(`   Status: ${err.status}`);
            console.log(`   URL: ${err.url}\n`);

            // Si falla, configurar reglas nuevamente
            console.log("4. RECON FIGURANDO REGLAS A NULL...");
            await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

            await pb.collections.update(promptsCol.id, {
                listRule: null,
                viewRule: null
            });

            console.log("   ✅ Reglas actualizadas a NULL\n");

            // Probar de nuevo
            pb.authStore.clear();
            console.log("5. PROBANDO NUEVAMENTE COMO PÚBLICO:");
            const retryTest = await pb.collection('prompts').getList(1, 2);
            console.log(`   ✅ AHORA FUNCIONA: ${retryTest.totalItems} prompts\n`);
        }

        console.log("🎉 DIAGNÓSTICO COMPLETADO");

    } catch (err) {
        console.error("\n💀 ERROR CRÍTICO:", err.message);
        console.error("Status:", err.status);
        console.error("Data:", err.data);
    }
}

debugCurrentState();
