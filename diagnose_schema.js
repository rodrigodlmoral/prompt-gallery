import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function diagnoseSchemaProblem() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        // Obtener esquema completo
        const collections = await pb.collections.getFullList();
        const promptsCollection = collections.find(c => c.name === 'prompts');

        console.log("=== ESQUEMA DE LA COLECCIÓN 'prompts' ===\n");
        console.log(JSON.stringify(promptsCollection, null, 2));

        console.log("\n\n=== PROBANDO CONSULTA COMO ADMIN ===");
        const adminResult = await pb.collection('prompts').getList(1, 2);
        console.log(`✅ Como admin funciona: ${adminResult.totalItems} prompts encontrados`);

        console.log("\n=== PROBANDO CONSULTA PÚBLICA ===");

        // Cerrar sesión para simular usuario público
        pb.authStore.clear();

        try {
            const publicResult = await pb.collection('prompts').getList(1, 2);
            console.log(`✅ Como público funciona: ${publicResult.totalItems} prompts`);
        } catch (err) {
            console.error("❌ Como público FALLA:", err.message);
            console.error("Status:", err.status);
            console.error("Data:", err.data);
        }

    } catch (err) {
        console.error("Error general:", err.message);
    }
}

diagnoseSchemaProblem();
