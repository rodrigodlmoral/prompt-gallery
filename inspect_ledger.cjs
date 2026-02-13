const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function inspectLedger() {
    try {
        console.log(`[INSPECT] Buscando 1 registro de LEDGER para obtener un ID válido...`);
        let validId = '';

        try {
            const res = await pb.collection('ledger').getList(1, 1);
            if (res.items.length > 0) {
                const item = res.items[0];
                validId = item.from_user; // Assuming there is at least one record
                console.log(`[DATA] ID encontrado: ${item.id}`);
                console.log(`[DATA] from_user para probar: "${validId}"`);
            } else {
                console.log(`[EMPTY] No hay registros en ledger.`);
                return;
            }
        } catch (e) {
            console.log(`[ERROR] Fetch inicial falló: ${e.message}`);
            return;
        }

        // Test Expand and Filter (REPRODUCE 400)
        console.log(`[TEST] Reproduciendo consulta del navegador...`);
        try {
            const filter = `from_user="${validId}" || to_user="${validId}"`;
            console.log(`[FILTER] Usando filtro: ${filter}`);

            // Expand opcional
            console.log(`[ACTION] Ejecutando getList con filter y expand...`);
            const resFilter = await pb.collection('ledger').getList(1, 10, {
                filter: filter,
                expand: 'from_user,to_user'
            });
            console.log(`[SUCCESS] Consulta funcionó! Encontrados: ${resFilter.totalItems}`);
            if (resFilter.items.length > 0) {
                console.log(`[EXPAND CHECK] from_user expanded:`, resFilter.items[0].expand?.from_user);
            }
        } catch (e) {
            console.log(`[FAIL] Consulta falló con error:`);
            console.log(`   Message: ${e.message}`);
            console.log(`   Status: ${e.status}`);
            console.log(`   Data:`, JSON.stringify(e.data, null, 2));
        }

    } catch (err) {
        console.error(`[FATAL] Script error:`, err);
    }
}

inspectLedger();
