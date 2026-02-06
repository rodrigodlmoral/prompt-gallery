import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function testDifferentParams() {
    console.log("=== PROBANDO DIFERENTES PARÁMETROS ===\n");

    // Test 1: Sin parámetros
    console.log("1. Sin parámetros extras:");
    try {
        const test1 = await pb.collection('prompts').getList(1, 10);
        console.log(`   ✅ OK: ${test1.items.length} items\n`);
    } catch (err) {
        console.log(`   ❌ FALLA: ${err.status}\n`);
    }

    // Test 2: Con sort
    console.log("2. Con sort: '-created':");
    try {
        const test2 = await pb.collection('prompts').getList(1, 10, {
            sort: '-created'
        });
        console.log(`   ✅ OK: ${test2.items.length} items\n`);
    } catch (err) {
        console.log(`   ❌ FALLA: ${err.status} - ${err.message}\n`);
    }

    // Test 3: Con sort diferente
    console.log("3. Con sort: 'created' (sin minus):");
    try {
        const test3 = await pb.collection('prompts').getList(1, 10, {
            sort: 'created'
        });
        console.log(`   ✅ OK: ${test3.items.length} items\n`);
    } catch (err) {
        console.log(`   ❌ FALLA: ${err.status}\n`);
    }

    // Test 4: Paginación grande
    console.log("4. Paginación con 100 items (sin sort):");
    try {
        const test4 = await pb.collection('prompts').getList(1, 100);
        console.log(`   ✅ OK: ${test4.items.length} items\n`);
    } catch (err) {
        console.log(`   ❌ FALLA: ${err.status}\n`);
    }

    console.log("=== FIN DE PRUEBAS ===");
}

testDifferentParams();
