import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function tryDifferentRules() {
    try {
        console.log("🔧 PROBANDO DIFERENTES SINTAXIS DE REGLAS\n");

        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        const collections = await pb.collections.getFullList();
        const promptsCol = collections.find(c => c.name === 'prompts');

        // Probar con regla explícita que siempre es true
        console.log("1. Probando con '@request.auth.id != \"\" || @request.auth.id = \"\"'...");
        await pb.collections.update(promptsCol.id, {
            listRule: '@request.auth.id != "" || @request.auth.id = ""',
            viewRule: '@request.auth.id != "" || @request.auth.id = ""'
        });

        pb.authStore.clear();
        try {
            const test1 = await pb.collection('prompts').getList(1, 2);
            console.log(`   ✅ FUNCIONA! ${test1.totalItems} prompts\n`);
            return;
        } catch (err) {
            console.log(`   ❌ Falla: ${err.status}\n`);
        }

        // Probar con regla siempre verdadera
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("2. Probando con regla siempre verdadera '@request.data.id:isset = false || @request.data.id:isset = true'...");
        await pb.collections.update(promptsCol.id, {
            listRule: '@request.data.id:isset = false || @request.data.id:isset = true',
            viewRule: '@request.data.id:isset = false || @request.data.id:isset = true'
        });

        pb.authStore.clear();
        try {
            const test2 = await pb.collection('prompts').getList(1, 2);
            console.log(`   ✅ FUNCIONA! ${test2.totalItems} prompts\n`);
            return;
        } catch (err) {
            console.log(`   ❌ Falla: ${err.status}\n`);
        }

        // Probar eliminando completamente las reglas (null)
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("3. Probando con reglas NULL...");
        await pb.collections.update(promptsCol.id, {
            listRule: null,
            viewRule: null
        });

        pb.authStore.clear();
        try {
            const test3 = await pb.collection('prompts').getList(1, 2);
            console.log(`   ✅ FUNCIONA! ${test3.totalItems} prompts\n`);
            return;
        } catch (err) {
            console.log(`   ❌ Falla: ${err.status}\n`);
        }

        console.log("❌ NINGUNA REGLA FUNCIONÓ");
        console.log("Esto confirma que hay un problema de configuración más profundo.");

    } catch (err) {
        console.error("Error:", err.message);
    }
}

tryDifferentRules();
