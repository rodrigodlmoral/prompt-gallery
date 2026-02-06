import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function findLimit() {
    console.log("=== ENCONTRANDO LÍMITE DE CONSULTA ===\n");

    const limits = [2, 5, 10, 20, 30, 50, 100];

    for (const limit of limits) {
        try {
            console.log(`Probando perPage=${limit}...`);
            const result = await pb.collection('prompts').getList(1, limit, {
                sort: '-created'
            });
            console.log(`  ✅ OK: ${result.items.length} items recibidos`);
        } catch (err) {
            console.log(`  ❌ FALLA con perPage=${limit} (Error ${err.status})`);
            console.log(`\n🔴 LÍMITE MÁXIMO ENCONTRADO: ${limits[limits.indexOf(limit) - 1]}\n`);
            return limits[limits.indexOf(limit) - 1];
        }
    }

    console.log("\n✅ Todos los límites funcionaron");
    return 100;
}

findLimit();
