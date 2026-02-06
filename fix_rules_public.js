import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function fixAPIRulesPermanently() {
    try {
        console.log("🔧 REPARACIÓN DEFINITIVA DE API RULES\n");

        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado como admin\n");

        const collections = await pb.collections.getFullList();
        const promptsCollection = collections.find(c => c.name === 'prompts');

        console.log("📋 REGLAS ACTUALES:");
        console.log(`   List Rule: ${promptsCollection.listRule || '(null)'}`);
        console.log(`   View Rule: ${promptsCollection.viewRule || '(null)'}\n`);

        // Intentar con reglas MÁS PERMISIVAS
        console.log("🔓 Configurando reglas PÚBLICAS totales...");

        await pb.collections.update(promptsCollection.id, {
            listRule: "",  // VACÍO = ACCESO PÚBLICO TOTAL
            viewRule: ""   // VACÍO = ACCESO PÚBLICO TOTAL
        });

        console.log("✅ Reglas actualizadas a PÚBLICAS\n");

        // Verificar
        const updated = await pb.collections.getOne(promptsCollection.id);
        console.log("📋 NUEVAS REGLAS:");
        console.log(`   List Rule: ${updated.listRule || '(null)'}`);
        console.log(`   View Rule: ${updated.viewRule || '(null)'}\n`);

        // Probar consulta pública
        pb.authStore.clear();
        console.log("🧪 Probando consulta PÚBLICA...");

        const test = await pb.collection('prompts').getList(1, 5);
        console.log(`✅ ¡FUNCIONA! ${test.totalItems} prompts accesibles\n`);

        console.log("🎉 PROBLEMA RESUELTO");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        console.error("Data:", err.data);
    }
}

fixAPIRulesPermanently();
