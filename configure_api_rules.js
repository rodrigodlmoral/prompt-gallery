import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

// CREDENCIALES DE ADMIN
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function configureAPIRules() {
    try {
        console.log("🔧 CONFIGURANDO API RULES AUTOMÁTICAMENTE\n");

        // 1. Autenticar como admin
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado como admin\n");

        // 2. Obtener la colección 'prompts'
        const collections = await pb.collections.getFullList();
        const promptsCollection = collections.find(c => c.name === 'prompts');

        if (!promptsCollection) {
            console.error("❌ Colección 'prompts' no encontrada");
            return;
        }

        console.log(`📂 Colección encontrada: ${promptsCollection.name} (ID: ${promptsCollection.id})\n`);

        // 3. Configurar las API Rules
        console.log("📝 Configurando API Rules...");

        await pb.collections.update(promptsCollection.id, {
            listRule: "is_private = false || author.id = @request.auth.id",
            viewRule: "is_private = false || author.id = @request.auth.id"
        });

        console.log("✅ List Rule: is_private = false || author.id = @request.auth.id");
        console.log("✅ View Rule: is_private = false || author.id = @request.auth.id");

        console.log("\n🎉 API RULES CONFIGURADAS EXITOSAMENTE");
        console.log("La galería ahora debería funcionar correctamente.");

    } catch (err) {
        console.error("\n❌ ERROR:", err.message);
        console.error("Data:", err.data);
    }
}

configureAPIRules();
