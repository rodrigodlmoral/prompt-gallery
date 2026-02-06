import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function diagnose() {
    console.log("=== DIAGNÓSTICO COMPLETO ===\n");

    try {
        // 1. Verificar si hay prompts públicos
        console.log("1. Verificando prompts públicos...");
        const publicPrompts = await pb.collection('prompts').getList(1, 5, {
            sort: '-created'
        });
        console.log(`✅ Total de prompts: ${publicPrompts.totalItems}`);
        console.log(`✅ Prompts en página 1: ${publicPrompts.items.length}`);

        if (publicPrompts.items.length > 0) {
            const first = publicPrompts.items[0];
            console.log("\n2. Estructura del primer prompt:");
            console.log(`   - ID: ${first.id}`);
            console.log(`   - Title: ${first.title}`);
            console.log(`   - image_url: ${first.image_url ? 'SÍ' : 'NO'}`);
            console.log(`   - image: ${first.image ? 'SÍ' : 'NO'}`);
            console.log(`   - is_private: ${first.is_private}`);
            console.log(`   - author: ${first.author}`);
        }

        // 3. Verificar usuarios
        console.log("\n3. Verificando usuarios...");
        const users = await pb.collection('users').getList(1, 1);
        console.log(`✅ Total de usuarios: ${users.totalItems}`);

    } catch (err) {
        console.error("\n❌ ERROR AL CONSULTAR POCKETBASE:");
        console.error(`   Mensaje: ${err.message}`);
        console.error(`   Status: ${err.status || 'N/A'}`);

        if (err.status === 403) {
            console.log("\n🔒 PROBLEMA DE PERMISOS DETECTADO");
            console.log("   Las API Rules están bloqueando el acceso público.");
            console.log("   Solución: Configurar List Rule y View Rule en PocketBase Admin.");
        }
    }
}

diagnose();
