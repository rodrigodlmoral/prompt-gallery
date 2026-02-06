// Script para verificar qué está pasando en el navegador
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function debugBrowserIssue() {
    console.log("=== DEBUGGING BROWSER ISSUE ===\n");

    // 1. Verificar conectividad básica
    console.log("1. Probando conectividad...");
    try {
        const test1 = await pb.collection('prompts').getList(1, 2);
        console.log(`✅ Conectividad OK: ${test1.totalItems} prompts`);
    } catch (err) {
        console.error(`❌ Error de conectividad: ${err.message}`);
        return;
    }

    // 2. Simular exactamente lo que hace store.js
    console.log("\n2. Simulando store.loadPrompts()...");
    try {
        const records = await pb.collection('prompts').getList(1, 100, {
            sort: '-created'
        });

        console.log(`✅ Carga exitosa: ${records.totalItems} prompts`);
        console.log(`   Items recibidos: ${records.items.length}`);

        // 3. Verificar el mapping
        console.log("\n3. Verificando mapping...");
        const mapped = records.items.map(p => ({
            id: p.id,
            title: p.title,
            image: p.image,
            isPrivate: p.is_private || false
        }));

        console.log(`✅ Mapping OK: ${mapped.length} items`);

        // 4. Filtrar públicos
        const publicPrompts = mapped.filter(p => !p.isPrivate);
        console.log(`\n4. Prompts públicos: ${publicPrompts.length}`);

        if (publicPrompts.length === 0) {
            console.error("\n❌ PROBLEMA: Todos los prompts están marcados como privados!");
            console.log("Primeros 3 prompts:");
            records.items.slice(0, 3).forEach(p => {
                console.log(`  - "${p.title}": is_private=${p.is_private}`);
            });
        } else {
            console.log(`\n✅ Hay ${publicPrompts.length} prompts públicos disponibles`);
            console.log("Primeros 3:");
            publicPrompts.slice(0, 3).forEach((p, i) => {
                console.log(`  ${i + 1}. "${p.title}" - imagen: ${p.image ? 'SÍ' : 'NO'}`);
            });
        }

    } catch (err) {
        console.error(`\n❌ Error en loadPrompts: ${err.message}`);
        console.error(`Status: ${err.status}`);
    }
}

debugBrowserIssue();
