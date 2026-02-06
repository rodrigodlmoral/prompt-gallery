import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function testFullLoad() {
    try {
        console.log("=== PRUEBA COMPLETA DE CARGA ===\n");

        // Simular lo que hace store.js
        const records = await pb.collection('prompts').getList(1, 100, {
            sort: '-created',
            expand: 'author'
        });

        console.log(`Total de prompts: ${records.totalItems}`);
        console.log(`Prompts cargados en página 1: ${records.items.length}\n`);

        // Verificar si tienen imágenes
        let conImagen = 0;
        let sinImagen = 0;

        records.items.forEach(p => {
            if (p.image) {
                conImagen++;
            } else {
                sinImagen++;
                console.log(`❌ Sin imagen: "${p.title}"`);
            }
        });

        console.log(`\n✅ Con imagen: ${conImagen}`);
        console.log(`❌ Sin imagen: ${sinImagen}`);

        if (conImagen > 0) {
            console.log("\n✅ LA GALERÍA DEBERÍA FUNCIONAR");
            console.log("Si no la ves, es problema de caché del navegador.");
            console.log("Presiona Ctrl+Shift+R para forzar recarga.");
        } else {
            console.log("\n❌ PROBLEMA: Ningún prompt tiene imagen");
        }

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        console.error("Status:", err.status);
    }
}

testFullLoad();
