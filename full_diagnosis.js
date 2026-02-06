import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function fullDiagnosis() {
    console.log("=== DIAGNÓSTICO COMPLETO: SIMULANDO FRONTEND ===\n");

    try {
        // 1. Consulta exacta que hace store.js
        console.log("1. Ejecutando consulta EXACTA de store.js...");
        const records = await pb.collection('prompts').getList(1, 100, {
            sort: '-created'
        });

        console.log(`✅ Consulta exitosa: ${records.totalItems} prompts encontrados\n`);

        // 2. Verificar el mapping que hace store.js
        console.log("2. Simulando el mapping de store.js...");
        const mapped = records.items.map(p => ({
            id: p.id,
            title: p.title,
            image: p.image,
            author: p.author_name || 'Explorador',
            isPrivate: p.is_private || false
        }));

        console.log(`✅ Mapping exitoso: ${mapped.length} prompts procesados\n`);

        // 3. Filtrar solo públicos (como hace getFilteredPrompts)
        const publicPrompts = mapped.filter(p => !p.isPrivate);
        console.log(`✅ Prompts públicos: ${publicPrompts.length}\n`);

        // 4. Verificar cuántos tienen imagen
        const withImage = publicPrompts.filter(p => p.image);
        const withoutImage = publicPrompts.filter(p => !p.image);

        console.log("3. Análisis de imágenes:");
        console.log(`   ✅ Con imagen: ${withImage.length}`);
        console.log(`   ❌ Sin imagen: ${withoutImage.length}\n`);

        // 5. Mostrar los primeros 5 para verificar
        console.log("4. Primeros 5 prompts:");
        publicPrompts.slice(0, 5).forEach((p, i) => {
            console.log(`   ${i + 1}. "${p.title}"`);
            console.log(`      - Imagen: ${p.image ? '✅' : '❌'}`);
            console.log(`      - Autor: ${p.author}`);
        });

        if (publicPrompts.length === 0) {
            console.log("\n❌ PROBLEMA CRÍTICO: No hay prompts públicos!");
            console.log("Todos los prompts están marcados como privados.");
        } else {
            console.log(`\n✅ LA GALERÍA DEBERÍA MOSTRAR ${publicPrompts.length} PROMPTS`);
        }

    } catch (err) {
        console.error("\n❌ ERROR EN LA CONSULTA:");
        console.error(`   Mensaje: ${err.message}`);
        console.error(`   Status: ${err.status || 'N/A'}`);
        console.error(`   Data:`, err.data);
    }
}

fullDiagnosis();
