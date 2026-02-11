const PocketBase = require('pocketbase/cjs');

async function listCollections() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        console.log("--- LISTA DE COLECCIONES ---");
        // Intentamos listar colecciones (requiere admin normalmente)
        // Pero podemos intentar acceder a las comunes
        const collections = ['users', 'prompts', 'activity_logs', 'transactions', 'ledger', 'promptbits_ledger', 'tickets'];

        for (const name of collections) {
            try {
                const list = await pb.collection(name).getList(1, 1);
                console.log(`[OK] ${name} - Total: ${list.totalItems}`);
            } catch (e) {
                console.log(`[ERR] ${name} - No accesible o no existe: ${e.message}`);
            }
        }
    } catch (error) {
        console.error("Error general:", error);
    }
}

listCollections();
