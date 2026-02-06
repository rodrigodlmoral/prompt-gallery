import PocketBase from 'pocketbase';

// URL exacta que usa el frontend
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function testFromBrowserPerspective() {
    console.log("=== PRUEBA EXACTA COMO EL NAVEGADOR ===\n");

    try {
        // 1. SIN autenticación (como usuario público)
        console.log("1. Probando SIN autenticación (como navegador sin login)...");

        const result = await pb.collection('prompts').getList(1, 100, {
            sort: '-created'
        });

        console.log(`✅ FUNCIONA: ${result.totalItems} prompts cargados`);
        console.log(`   Total páginas: ${result.totalPages}`);
        console.log(`   Items en esta página: ${result.items.length}\n`);

        // 2. Mostrar los primeros 3
        console.log("2. Primeros 3 prompts:");
        result.items.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. "${p.title}"`);
            console.log(`      ID: ${p.id}`);
            console.log(`      Imagen: ${p.image ? 'SÍ' : 'NO'}`);
            console.log(`      Privado: ${p.is_private || false}\n`);
        });

        console.log("🎉 TODO FUNCIONA CORRECTAMENTE");
        console.log("El problema DEBE ser caché del navegador o CDN de Vercel.\n");

    } catch (err) {
        console.error("❌ FALLA:", err.message);
        console.error("Status:", err.status);
        console.error("URL:", err.url);
        console.error("\nSi esto falla, el problema está en PocketBase, NO en el código.");
    }
}

testFromBrowserPerspective();
