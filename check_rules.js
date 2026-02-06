import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function checkCurrentRules() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        const collections = await pb.collections.getFullList();
        const promptsCol = collections.find(c => c.name === 'prompts');

        console.log("📋 REGLAS ACTUALES:");
        console.log(`   listRule: "${promptsCol.listRule}"`);
        console.log(`   viewRule: "${promptsCol.viewRule}"\n`);

        if (promptsCol.listRule === '@request.auth.id != "" || @request.auth.id = ""') {
            console.log("✅ Las reglas están correctas");
        } else {
            console.log("❌ LAS REGLAS SE REVIRTIERON");
            console.log("\nReaplicando...");

            await pb.collections.update(promptsCol.id, {
                listRule: '@request.auth.id != "" || @request.auth.id = ""',
                viewRule: '@request.auth.id != "" || @request.auth.id = ""'
            });

            console.log("✅ Reglas reaplicadas");
        }

        // Probar acceso público
        pb.authStore.clear();
        const test = await pb.collection('prompts').getList(1, 5);
        console.log(`\n✅ Acceso público funciona: ${test.totalItems} prompts`);

    } catch (err) {
        console.error("Error:", err.message, err.status);
    }
}

checkCurrentRules();
